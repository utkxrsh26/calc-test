# frozen_string_literal: true

require_relative 'spec_helper'
require_relative '../app/app'

RSpec.describe PolyglotAPI do
  include Rack::Test::Methods

  def app
    PolyglotAPI
  end

  describe 'GET /health' do
    it 'returns healthy status' do
      get '/health'
      expect(last_response.status).to eq(200)
      json_response = JSON.parse(last_response.body)
      expect(json_response['status']).to eq('healthy')
    end
  end

  describe 'POST /analyze' do
    it 'accepts valid content' do
      allow_any_instance_of(PolyglotAPI).to receive(:call_go_service)
        .and_return({ 'language' => 'python', 'lines' => ['def test'] })
      allow_any_instance_of(PolyglotAPI).to receive(:call_python_service)
        .and_return({ 'score' => 85.0, 'issues' => [] })

      post '/analyze', { content: 'def test(): pass', path: 'test.py' }.to_json, 'CONTENT_TYPE' => 'application/json'
      expect(last_response.status).to eq(200)
      json_response = JSON.parse(last_response.body)
      expect(json_response).to have_key('summary')
    end
  end

  describe 'GET /status' do
    context 'when all services are healthy' do
      it 'returns healthy statuses for all services' do
        allow(HTTParty).to receive(:get).with('http://localhost:8080/health', timeout: 2)
          .and_return(double(code: 200))
        allow(HTTParty).to receive(:get).with('http://localhost:8081/health', timeout: 2)
          .and_return(double(code: 200))

        get '/status'
        expect(last_response.status).to eq(200)
        json_response = JSON.parse(last_response.body)
        expect(json_response['services']['ruby']['status']).to eq('healthy')
        expect(json_response['services']['go']['status']).to eq('healthy')
        expect(json_response['services']['python']['status']).to eq('healthy')
      end
    end

    context 'when dependent services are unhealthy or unreachable' do
      it 'reports unhealthy and unreachable statuses' do
        allow(HTTParty).to receive(:get).with('http://localhost:8080/health', timeout: 2)
          .and_return(double(code: 500))
        allow(HTTParty).to receive(:get).with('http://localhost:8081/health', timeout: 2)
          .and_raise(StandardError.new('timeout'))

        get '/status'
        expect(last_response.status).to eq(200)
        json_response = JSON.parse(last_response.body)
        expect(json_response['services']['go']['status']).to eq('unhealthy')
        expect(json_response['services']['python']['status']).to eq('unreachable')
        expect(json_response['services']['python']).to have_key('error')
      end
    end
  end

  describe 'POST /analyze (edge cases)' do
    it 'returns 400 when content is missing' do
      post '/analyze', {}.to_json, 'CONTENT_TYPE' => 'application/json'
      expect(last_response.status).to eq(400)
      json_response = JSON.parse(last_response.body)
      expect(json_response['error']).to eq('Missing content')
    end

    it 'falls back to params when JSON is invalid and uses provided params' do
      allow_any_instance_of(PolyglotAPI).to receive(:call_go_service)
        .and_return({ 'language' => 'ruby', 'lines' => ['puts 1'] })
      allow_any_instance_of(PolyglotAPI).to receive(:call_python_service)
        .and_return({ 'score' => 90.0, 'issues' => [] })

      # invalid JSON body but with query params to fallback to
      post '/analyze?content=puts%201&path=test.rb', 'not-json', 'CONTENT_TYPE' => 'application/json'
      expect(last_response.status).to eq(200)
      json_response = JSON.parse(last_response.body)
      expect(json_response).to have_key('summary')
      expect(json_response['summary']['language']).to eq('ruby')
    end

    it 'defaults path to unknown when not provided' do
      go_result = { 'language' => 'unknown', 'lines' => ['x'] }
      py_result = { 'score' => 50, 'issues' => [] }

      expect_any_instance_of(PolyglotAPI).to receive(:call_go_service)
        .with('/parse', hash_including(path: 'unknown', content: 'code'))
        .and_return(go_result)
      allow_any_instance_of(PolyglotAPI).to receive(:call_python_service).and_return(py_result)

      post '/analyze', { content: 'code' }.to_json, 'CONTENT_TYPE' => 'application/json'
      expect(last_response.status).to eq(200)
      json_response = JSON.parse(last_response.body)
      expect(json_response['summary']['language']).to eq('unknown')
    end
  end

  describe 'POST /diff' do
    it 'returns 400 when required params are missing' do
      post '/diff', {}.to_json, 'CONTENT_TYPE' => 'application/json'
      expect(last_response.status).to eq(400)
      json_response = JSON.parse(last_response.body)
      expect(json_response['error']).to eq('Missing old_content or new_content')
    end

    it 'returns diff and new code review on success' do
      allow_any_instance_of(PolyglotAPI).to receive(:call_go_service)
        .with('/diff', hash_including(old_content: 'a', new_content: 'b'))
        .and_return({ 'diff' => '@@ -1 +1 @@' })
      allow_any_instance_of(PolyglotAPI).to receive(:call_python_service)
        .with('/review', hash_including(content: 'b'))
        .and_return({ 'score' => 88, 'issues' => [] })

      post '/diff', { old_content: 'a', new_content: 'b' }.to_json, 'CONTENT_TYPE' => 'application/json'
      expect(last_response.status).to eq(200)
      json_response = JSON.parse(last_response.body)
      expect(json_response['diff']).to eq({ 'diff' => '@@ -1 +1 @@' })
      expect(json_response['new_code_review']).to eq({ 'score' => 88, 'issues' => [] })
    end
  end

  describe 'POST /metrics' do
    it 'returns 400 when content is missing' do
      post '/metrics', {}.to_json, 'CONTENT_TYPE' => 'application/json'
      expect(last_response.status).to eq(400)
      json_response = JSON.parse(last_response.body)
      expect(json_response['error']).to eq('Missing content')
    end

    it 'returns metrics, review, and calculated overall_quality' do
      metrics = { 'complexity' => 1 }
      review = { 'issues' => ['n1'], 'score' => 90 }
      allow_any_instance_of(PolyglotAPI).to receive(:call_go_service).with('/metrics', hash_including(content: 'x'))
        .and_return(metrics)
      allow_any_instance_of(PolyglotAPI).to receive(:call_python_service).with('/review', hash_including(content: 'x'))
        .and_return(review)

      post '/metrics', { content: 'x' }.to_json, 'CONTENT_TYPE' => 'application/json'
      expect(last_response.status).to eq(200)
      json_response = JSON.parse(last_response.body)
      expect(json_response['metrics']).to eq(metrics)
      expect(json_response['review']).to eq(review)
      # Expected: base 0.9 - complexity 0.1 - issues 0.5 = 0.3 => 30.0
      expect(json_response['overall_quality']).to eq(30.0)
    end

    it 'returns overall_quality 0.0 when underlying services return errors' do
      allow_any_instance_of(PolyglotAPI).to receive(:call_go_service).and_return({ 'error' => 'boom' })
      allow_any_instance_of(PolyglotAPI).to receive(:call_python_service).and_return({ 'score' => 80, 'issues' => [] })

      post '/metrics', { content: 'x' }.to_json, 'CONTENT_TYPE' => 'application/json'
      expect(last_response.status).to eq(200)
      json_response = JSON.parse(last_response.body)
      expect(json_response['overall_quality']).to eq(0.0)
    end
  end

  describe 'private helpers' do
    let(:instance) do
      described_class.new!
    end

    describe '#detect_language' do
      it 'detects known extensions and returns language' do
        expect(instance.send(:detect_language, 'file.rb')).to eq('ruby')
        expect(instance.send(:detect_language, 'file.py')).to eq('python')
        expect(instance.send(:detect_language, 'file.go')).to eq('go')
        expect(instance.send(:detect_language, 'file.js')).to eq('javascript')
        expect(instance.send(:detect_language, 'file.ts')).to eq('typescript')
        expect(instance.send(:detect_language, 'file.java')).to eq('java')
      end

      it 'returns unknown for unsupported extensions or missing path' do
        expect(instance.send(:detect_language, 'file.unknownext')).to eq('unknown')
        expect(instance.send(:detect_language, '')).to eq('unknown')
      end
    end

    describe '#calculate_quality_score' do
      it 'returns 0.0 when metrics is nil' do
        expect(instance.send(:calculate_quality_score, nil, { 'score' => 50 })).to eq(0.0)
      end

      it 'returns 0.0 when review is nil' do
        expect(instance.send(:calculate_quality_score, { 'complexity' => 1 }, nil)).to eq(0.0)
      end

      it 'returns 0.0 when either metrics or review has an error' do
        expect(instance.send(:calculate_quality_score, { 'error' => 'x' }, { 'score' => 50 })).to eq(0.0)
        expect(instance.send(:calculate_quality_score, { 'complexity' => 0 }, { 'error' => 'y' })).to eq(0.0)
      end

      it 'calculates and clamps to 0 when penalties exceed base' do
        metrics = { 'complexity' => 3 }
        review = { 'issues' => [1, 2], 'score' => 80 }
        expect(instance.send(:calculate_quality_score, metrics, review)).to eq(0)
      end

      it 'calculates and clamps to 100 when score exceeds 100' do
        metrics = { 'complexity' => 0 }
        review = { 'issues' => [], 'score' => 150 }
        expect(instance.send(:calculate_quality_score, metrics, review)).to eq(100)
      end

      it 'calculates a positive score with rounding' do
        metrics = { 'complexity' => 1 }
        review = { 'issues' => ['i1'], 'score' => 90 }
        expect(instance.send(:calculate_quality_score, metrics, review)).to eq(30.0)
      end
    end

    describe '#check_service_health' do
      it 'returns healthy when response code is 200' do
        allow(HTTParty).to receive(:get).with('http://svc/health', timeout: 2)
          .and_return(double(code: 200))
        result = instance.send(:check_service_health, 'http://svc')
        expect(result).to eq({ status: 'healthy' })
      end

      it 'returns unhealthy when response code is not 200' do
        allow(HTTParty).to receive(:get).with('http://svc/health', timeout: 2)
          .and_return(double(code: 500))
        result = instance.send(:check_service_health, 'http://svc')
        expect(result).to eq({ status: 'unhealthy' })
      end

      it 'returns unreachable with error message on exception' do
        allow(HTTParty).to receive(:get).with('http://svc/health', timeout: 2)
          .and_raise(StandardError.new('boom'))
        result = instance.send(:check_service_health, 'http://svc')
        expect(result[:status]).to eq('unreachable')
        expect(result[:error]).to eq('boom')
      end
    end

    describe '#call_go_service and #call_python_service' do
      let(:fake_settings) do
        double(go_service_url: 'http://go', python_service_url: 'http://py')
      end

      before do
        allow(instance).to receive(:settings).and_return(fake_settings)
      end

      it 'parses JSON response from go service' do
        response = double(body: { hello: 'world' }.to_json)
        expect(HTTParty).to receive(:post).with(
          'http://go/parse',
          body: { content: 'x', path: 'p' }.to_json,
          headers: { 'Content-Type' => 'application/json' },
          timeout: 5
        ).and_return(response)
        result = instance.send(:call_go_service, '/parse', { content: 'x', path: 'p' })
        expect(result).to eq({ 'hello' => 'world' })
      end

      it 'returns error hash when go service call fails' do
        expect(HTTParty).to receive(:post).and_raise(StandardError.new('fail'))
        result = instance.send(:call_go_service, '/parse', { content: 'x' })
        expect(result).to eq({ error: 'fail' })
      end

      it 'parses JSON response from python service' do
        response = double(body: { ok: true }.to_json)
        expect(HTTParty).to receive(:post).with(
          'http://py/review',
          body: { content: 'x' }.to_json,
          headers: { 'Content-Type' => 'application/json' },
          timeout: 5
        ).and_return(response)
        result = instance.send(:call_python_service, '/review', { content: 'x' })
        expect(result).to eq({ 'ok' => true })
      end

      it 'returns error hash when python service call fails' do
        expect(HTTParty).to receive(:post).and_raise(StandardError.new('pyfail'))
        result = instance.send(:call_python_service, '/review', { content: 'x' })
        expect(result).to eq({ error: 'pyfail' })
      end
    end
  end
end
