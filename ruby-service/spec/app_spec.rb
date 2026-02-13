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

    context 'when content is missing' do
      it 'returns 400 error' do
        post '/analyze', { path: 'test.py' }.to_json, 'CONTENT_TYPE' => 'application/json'
        expect(last_response.status).to eq(400)
        json_response = JSON.parse(last_response.body)
        expect(json_response['error']).to eq('Missing content')
      end
    end

    context 'when JSON is invalid and params are used' do
      it 'falls back to params and succeeds' do
        allow_any_instance_of(PolyglotAPI).to receive(:call_go_service)
          .and_return({ 'language' => 'python', 'lines' => ['print(1)'] })
        allow_any_instance_of(PolyglotAPI).to receive(:call_python_service)
          .and_return({ 'score' => 90.0, 'issues' => [] })

        post '/analyze?content=print(1)&path=main.py', 'not valid json', 'CONTENT_TYPE' => 'application/json'
        expect(last_response.status).to eq(200)
        json_response = JSON.parse(last_response.body)
        expect(json_response['summary']['language']).to eq('python')
      end
    end
  end

  describe 'GET /status' do
    it 'returns healthy statuses when services are reachable' do
      allow(HTTParty).to receive(:get).with('http://localhost:8080/health', timeout: 2).and_return(double(code: 200))
      allow(HTTParty).to receive(:get).with('http://localhost:8081/health', timeout: 2).and_return(double(code: 200))

      get '/status'
      expect(last_response.status).to eq(200)
      json_response = JSON.parse(last_response.body)
      expect(json_response['services']['ruby']['status']).to eq('healthy')
      expect(json_response['services']['go']['status']).to eq('healthy')
      expect(json_response['services']['python']['status']).to eq('healthy')
    end

    it 'marks service as unreachable when an error occurs' do
      allow(HTTParty).to receive(:get).with('http://localhost:8080/health', timeout: 2).and_return(double(code: 200))
      allow(HTTParty).to receive(:get).with('http://localhost:8081/health', timeout: 2).and_raise(StandardError.new('timeout'))

      get '/status'
      expect(last_response.status).to eq(200)
      json_response = JSON.parse(last_response.body)
      expect(json_response['services']['go']['status']).to eq('healthy')
      expect(json_response['services']['python']['status']).to eq('unreachable')
      expect(json_response['services']['python']).to have_key('error')
    end
  end

  describe 'POST /diff' do
    context 'with valid payload' do
      it 'returns diff and new_code_review' do
        allow_any_instance_of(PolyglotAPI).to receive(:call_go_service)
          .with('/diff', hash_including(:old_content, :new_content))
          .and_return({ 'changes' => [] })
        allow_any_instance_of(PolyglotAPI).to receive(:call_python_service)
          .with('/review', hash_including(:content))
          .and_return({ 'score' => 75.0, 'issues' => [] })

        payload = { old_content: 'a', new_content: 'b' }
        post '/diff', payload.to_json, 'CONTENT_TYPE' => 'application/json'
        expect(last_response.status).to eq(200)
        json_response = JSON.parse(last_response.body)
        expect(json_response).to have_key('diff')
        expect(json_response).to have_key('new_code_review')
      end
    end

    context 'when required fields are missing' do
      it 'returns 400 error' do
        post '/diff', { old_content: 'a' }.to_json, 'CONTENT_TYPE' => 'application/json'
        expect(last_response.status).to eq(400)
        json_response = JSON.parse(last_response.body)
        expect(json_response['error']).to eq('Missing old_content or new_content')
      end
    end

    context 'when JSON is invalid and params are used' do
      it 'falls back to params and succeeds' do
        allow_any_instance_of(PolyglotAPI).to receive(:call_go_service)
          .and_return({ 'changes' => [{ 'line' => 1 }] })
        allow_any_instance_of(PolyglotAPI).to receive(:call_python_service)
          .and_return({ 'score' => 80.0, 'issues' => [] })

        post '/diff?old_content=foo&new_content=bar', 'not json', 'CONTENT_TYPE' => 'application/json'
        expect(last_response.status).to eq(200)
        json_response = JSON.parse(last_response.body)
        expect(json_response['diff']).to have_key('changes')
        expect(json_response['new_code_review']).to have_key('score')
      end
    end
  end

  describe 'POST /metrics' do
    context 'with valid payload' do
      it 'returns metrics, review and overall_quality computed from inputs' do
        metrics = { 'complexity' => 1 }
        review = { 'score' => 90.0, 'issues' => [{}] }
        allow_any_instance_of(PolyglotAPI).to receive(:call_go_service)
          .with('/metrics', hash_including(:content))
          .and_return(metrics)
        allow_any_instance_of(PolyglotAPI).to receive(:call_python_service)
          .with('/review', hash_including(:content))
          .and_return(review)

        post '/metrics', { content: 'code' }.to_json, 'CONTENT_TYPE' => 'application/json'
        expect(last_response.status).to eq(200)
        json_response = JSON.parse(last_response.body)
        expect(json_response['metrics']).to eq(metrics)
        expect(json_response['review']).to eq(review)
        expect(json_response['overall_quality']).to eq(30.0)
      end
    end

    context 'when content is missing' do
      it 'returns 400 error' do
        post '/metrics', {}.to_json, 'CONTENT_TYPE' => 'application/json'
        expect(last_response.status).to eq(400)
        json_response = JSON.parse(last_response.body)
        expect(json_response['error']).to eq('Missing content')
      end
    end

    context 'when services return errors' do
      it 'sets overall_quality to 0.0 if metrics has error' do
        metrics = { 'error' => 'down' }
        review = { 'score' => 100.0, 'issues' => [] }
        allow_any_instance_of(PolyglotAPI).to receive(:call_go_service).and_return(metrics)
        allow_any_instance_of(PolyglotAPI).to receive(:call_python_service).and_return(review)

        post '/metrics', { content: 'code' }.to_json, 'CONTENT_TYPE' => 'application/json'
        expect(last_response.status).to eq(200)
        json_response = JSON.parse(last_response.body)
        expect(json_response['overall_quality']).to eq(0.0)
      end

      it 'sets overall_quality to 0.0 if review has error' do
        metrics = { 'complexity' => 0 }
        review = { 'error' => 'down' }
        allow_any_instance_of(PolyglotAPI).to receive(:call_go_service).and_return(metrics)
        allow_any_instance_of(PolyglotAPI).to receive(:call_python_service).and_return(review)

        post '/metrics', { content: 'code' }.to_json, 'CONTENT_TYPE' => 'application/json'
        expect(last_response.status).to eq(200)
        json_response = JSON.parse(last_response.body)
        expect(json_response['overall_quality']).to eq(0.0)
      end
    end
  end

  describe 'private helpers' do
    let(:instance) do
      described_class.new
    end

    describe '#detect_language' do
      it 'detects python from .py extension' do
        expect(instance.send(:detect_language, 'main.py')).to eq('python')
      end

      it 'detects ruby from .rb extension' do
        expect(instance.send(:detect_language, 'app.rb')).to eq('ruby')
      end

      it 'returns unknown for unsupported extensions' do
        expect(instance.send(:detect_language, 'README.md')).to eq('unknown')
      end
    end

    describe '#calculate_quality_score' do
      it 'calculates a positive score with small penalties' do
        metrics = { 'complexity' => 1 }
        review = { 'score' => 90.0, 'issues' => [{}] }
        expect(instance.send(:calculate_quality_score, metrics, review)).to eq(30.0)
      end

      it 'clamps to 0 when penalties outweigh base score' do
        metrics = { 'complexity' => 100 }
        review = { 'score' => 50.0, 'issues' => Array.new(5, {}) }
        expect(instance.send(:calculate_quality_score, metrics, review)).to eq(0)
      end

      it 'clamps to 100 when score exceeds 100 and no penalties' do
        metrics = { 'complexity' => 0 }
        review = { 'score' => 120.0, 'issues' => [] }
        expect(instance.send(:calculate_quality_score, metrics, review)).to eq(100)
      end

      it 'returns 0.0 if metrics is nil' do
        review = { 'score' => 80.0, 'issues' => [] }
        expect(instance.send(:calculate_quality_score, nil, review)).to eq(0.0)
      end

      it 'returns 0.0 if review is nil' do
        metrics = { 'complexity' => 1 }
        expect(instance.send(:calculate_quality_score, metrics, nil)).to eq(0.0)
      end

      it 'returns 0.0 if metrics has error' do
        metrics = { 'error' => 'x' }
        review = { 'score' => 80.0, 'issues' => [] }
        expect(instance.send(:calculate_quality_score, metrics, review)).to eq(0.0)
      end

      it 'returns 0.0 if review has error' do
        metrics = { 'complexity' => 1 }
        review = { 'error' => 'x' }
        expect(instance.send(:calculate_quality_score, metrics, review)).to eq(0.0)
      end
    end

    describe '#check_service_health' do
      it 'returns healthy for 200 response' do
        allow(HTTParty).to receive(:get).with('http://localhost:8080/health', timeout: 2).and_return(double(code: 200))
        expect(instance.send(:check_service_health, 'http://localhost:8080')).to eq({ status: 'healthy' })
      end

      it 'returns unreachable with error message on exception' do
        allow(HTTParty).to receive(:get).with('http://localhost:8081/health', timeout: 2).and_raise(StandardError.new('boom'))
        result = instance.send(:check_service_health, 'http://localhost:8081')
        expect(result[:status]).to eq('unreachable')
        expect(result).to have_key(:error)
      end
    end

    describe '#call_go_service' do
      it 'parses JSON body from service response' do
        response = double(body: { ok: true }.to_json)
        allow(HTTParty).to receive(:post).with(
          'http://localhost:8080/parse',
          body: { content: 'x', path: 'a' }.to_json,
          headers: { 'Content-Type' => 'application/json' },
          timeout: 5
        ).and_return(response)
        result = instance.send(:call_go_service, '/parse', { content: 'x', path: 'a' })
        expect(result).to eq({ 'ok' => true })
      end

      it 'returns error hash on exception' do
        allow(HTTParty).to receive(:post).and_raise(StandardError.new('down'))
        result = instance.send(:call_go_service, '/parse', { content: 'x', path: 'a' })
        expect(result).to have_key(:error)
        expect(result[:error]).to eq('down')
      end
    end

    describe '#call_python_service' do
      it 'parses JSON body from service response' do
        response = double(body: { ok: true, score: 99 }.to_json)
        allow(HTTParty).to receive(:post).with(
          'http://localhost:8081/review',
          body: { content: 'y' }.to_json,
          headers: { 'Content-Type' => 'application/json' },
          timeout: 5
        ).and_return(response)
        result = instance.send(:call_python_service, '/review', { content: 'y' })
        expect(result).to eq({ 'ok' => true, 'score' => 99 })
      end

      it 'returns error hash on exception' do
        allow(HTTParty).to receive(:post).and_raise(StandardError.new('timeout'))
        result = instance.send(:call_python_service, '/review', { content: 'y' })
        expect(result).to have_key(:error)
        expect(result[:error]).to eq('timeout')
      end
    end
  end
end
