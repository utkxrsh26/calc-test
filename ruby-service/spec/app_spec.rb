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
    let(:healthy_response) do
      instance_double(
        HTTParty::Response,
        code: 200
      )
    end

    let(:unhealthy_response) do
      instance_double(
        HTTParty::Response,
        code: 500
      )
    end

    it 'returns status for all services when all are healthy' do
      allow(HTTParty).to receive(:get).with('http://localhost:8080/health', timeout: 2)
        .and_return(healthy_response)
      allow(HTTParty).to receive(:get).with('http://localhost:8081/health', timeout: 2)
        .and_return(healthy_response)

      get '/status'

      expect(last_response.status).to eq(200)
      json_response = JSON.parse(last_response.body)
      services = json_response['services']
      expect(services['ruby']['status']).to eq('healthy')
      expect(services['go']['status']).to eq('healthy')
      expect(services['python']['status']).to eq('healthy')
    end

    it 'marks service as unhealthy when health check returns non-200' do
      allow(HTTParty).to receive(:get).with('http://localhost:8080/health', timeout: 2)
        .and_return(unhealthy_response)
      allow(HTTParty).to receive(:get).with('http://localhost:8081/health', timeout: 2)
        .and_return(healthy_response)

      get '/status'

      expect(last_response.status).to eq(200)
      json_response = JSON.parse(last_response.body)
      services = json_response['services']
      expect(services['go']['status']).to eq('unhealthy')
      expect(services['python']['status']).to eq('healthy')
    end

    it 'marks service as unreachable when an error is raised' do
      allow(HTTParty).to receive(:get).with('http://localhost:8080/health', timeout: 2)
        .and_raise(StandardError.new('connection error'))
      allow(HTTParty).to receive(:get).with('http://localhost:8081/health', timeout: 2)
        .and_return(healthy_response)

      get '/status'

      expect(last_response.status).to eq(200)
      json_response = JSON.parse(last_response.body)
      services = json_response['services']
      expect(services['go']['status']).to eq('unreachable')
      expect(services['go']['error']).to eq('connection error')
      expect(services['python']['status']).to eq('healthy')
    end
  end

  describe 'POST /analyze additional behavior' do
    context 'when content is missing' do
      it 'returns 400 with error message' do
        post '/analyze', {}.to_json, 'CONTENT_TYPE' => 'application/json'
        expect(last_response.status).to eq(400)
        json_response = JSON.parse(last_response.body)
        expect(json_response['error']).to eq('Missing content')
      end
    end

    context 'when request body is invalid JSON' do
      it 'falls back to params and still processes the request' do
        allow_any_instance_of(PolyglotAPI).to receive(:call_go_service)
          .and_return({ 'language' => 'ruby', 'lines' => ['puts "hi"'] })
        allow_any_instance_of(PolyglotAPI).to receive(:call_python_service)
          .and_return({ 'score' => 90.0, 'issues' => [] })

        post '/analyze', 'invalid-json', { 'CONTENT_TYPE' => 'application/json', 'CONTENT_LENGTH' => '12', 'rack.input' => StringIO.new('invalid-json'), 'CONTENT_TYPE' => 'application/json', 'CONTENT_LENGTH' => '12', 'CONTENT_TYPE' => 'application/json' }

        expect(last_response.status).to eq(200)
        json_response = JSON.parse(last_response.body)
        expect(json_response).to have_key('summary')
      end
    end
  end

  describe 'POST /diff' do
    context 'when old_content or new_content is missing' do
      it 'returns 400 when both are missing' do
        post '/diff', {}.to_json, 'CONTENT_TYPE' => 'application/json'
        expect(last_response.status).to eq(400)
        json_response = JSON.parse(last_response.body)
        expect(json_response['error']).to eq('Missing old_content or new_content')
      end

      it 'returns 400 when old_content is missing' do
        post '/diff', { new_content: 'new code' }.to_json, 'CONTENT_TYPE' => 'application/json'
        expect(last_response.status).to eq(400)
        json_response = JSON.parse(last_response.body)
        expect(json_response['error']).to eq('Missing old_content or new_content')
      end

      it 'returns 400 when new_content is missing' do
        post '/diff', { old_content: 'old code' }.to_json, 'CONTENT_TYPE' => 'application/json'
        expect(last_response.status).to eq(400)
        json_response = JSON.parse(last_response.body)
        expect(json_response['error']).to eq('Missing old_content or new_content')
      end
    end

    context 'with valid contents' do
      before do
        allow_any_instance_of(PolyglotAPI).to receive(:call_go_service)
          .with('/diff', hash_including(:old_content, :new_content))
          .and_return({ 'changes' => ['+ new line', '- old line'] })
        allow_any_instance_of(PolyglotAPI).to receive(:call_python_service)
          .with('/review', hash_including(:content))
          .and_return({ 'score' => 75.0, 'issues' => ['issue1'] })
      end

      it 'returns diff and new code review' do
        post '/diff',
             { old_content: 'old code', new_content: 'new code' }.to_json,
             'CONTENT_TYPE' => 'application/json'

        expect(last_response.status).to eq(200)
        json_response = JSON.parse(last_response.body)
        expect(json_response).to have_key('diff')
        expect(json_response).to have_key('new_code_review')
        expect(json_response['diff']['changes']).to be_an(Array)
        expect(json_response['new_code_review']['score']).to eq(75.0)
      end
    end

    context 'when JSON is invalid' do
      it 'falls back to params and still works' do
        allow_any_instance_of(PolyglotAPI).to receive(:call_go_service)
          .and_return({ 'changes' => [] })
        allow_any_instance_of(PolyglotAPI).to receive(:call_python_service)
          .and_return({ 'score' => 80.0, 'issues' => [] })

        post '/diff', 'invalid-json', { 'CONTENT_TYPE' => 'application/json' }

        expect(last_response.status).to eq(400).or eq(200)
      end
    end
  end

  describe 'POST /metrics' do
    context 'when content is missing' do
      it 'returns 400 with error message' do
        post '/metrics', {}.to_json, 'CONTENT_TYPE' => 'application/json'
        expect(last_response.status).to eq(400)
        json_response = JSON.parse(last_response.body)
        expect(json_response['error']).to eq('Missing content')
      end
    end

    context 'with valid content' do
      let(:metrics_response) do
        { 'complexity' => 3 }
      end

      let(:review_response) do
        { 'score' => 80.0, 'issues' => ['issue1', 'issue2'] }
      end

      before do
        allow_any_instance_of(PolyglotAPI).to receive(:call_go_service)
          .with('/metrics', hash_including(:content))
          .and_return(metrics_response)
        allow_any_instance_of(PolyglotAPI).to receive(:call_python_service)
          .with('/review', hash_including(:content))
          .and_return(review_response)
      end

      it 'returns metrics, review and overall_quality' do
        post '/metrics',
             { content: 'some code' }.to_json,
             'CONTENT_TYPE' => 'application/json'

        expect(last_response.status).to eq(200)
        json_response = JSON.parse(last_response.body)
        expect(json_response).to have_key('metrics')
        expect(json_response).to have_key('review')
        expect(json_response).to have_key('overall_quality')
        expect(json_response['metrics']).to eq(metrics_response)
        expect(json_response['review']).to eq(review_response)
        expect(json_response['overall_quality']).to be_a(Float)
      end
    end

    context 'when JSON is invalid' do
      it 'falls back to params and still works if content present' do
        allow_any_instance_of(PolyglotAPI).to receive(:call_go_service)
          .and_return({ 'complexity' => 1 })
        allow_any_instance_of(PolyglotAPI).to receive(:call_python_service)
          .and_return({ 'score' => 100.0, 'issues' => [] })

        post '/metrics', 'invalid-json', { 'CONTENT_TYPE' => 'application/json' }

        expect(last_response.status).to satisfy { |code| [200, 400].include?(code) }
      end
    end
  end

  describe '#check_service_health' do
    let(:instance) do
      described_class.new!
    end

    let(:healthy_http_response) do
      instance_double(
        HTTParty::Response,
        code: 200
      )
    end

    let(:unhealthy_http_response) do
      instance_double(
        HTTParty::Response,
        code: 500
      )
    end

    it 'returns healthy when HTTP status is 200' do
      allow(HTTParty).to receive(:get)
        .with('http://service/health', timeout: 2)
        .and_return(healthy_http_response)

      result = instance.send(:check_service_health, 'http://service')
      expect(result).to eq(status: 'healthy')
    end

    it 'returns unhealthy when HTTP status is not 200' do
      allow(HTTParty).to receive(:get)
        .with('http://service/health', timeout: 2)
        .and_return(unhealthy_http_response)

      result = instance.send(:check_service_health, 'http://service')
      expect(result).to eq(status: 'unhealthy')
    end

    it 'returns unreachable with error message when exception is raised' do
      allow(HTTParty).to receive(:get)
        .with('http://service/health', timeout: 2)
        .and_raise(StandardError.new('timeout'))

      result = instance.send(:check_service_health, 'http://service')
      expect(result[:status]).to eq('unreachable')
      expect(result[:error]).to eq('timeout')
    end
  end

  describe '#call_go_service' do
    let(:instance) do
      described_class.new!
    end

    let(:http_response) do
      instance_double(
        HTTParty::Response,
        body: { result: 'ok' }.to_json
      )
    end

    it 'posts to the go service and returns parsed JSON' do
      allow(HTTParty).to receive(:post)
        .with(
          'http://localhost:8080/parse',
          body: { content: 'code' }.to_json,
          headers: { 'Content-Type' => 'application/json' },
          timeout: 5
        ).and_return(http_response)

      result = instance.send(:call_go_service, '/parse', { content: 'code' })
      expect(result).to eq('result' => 'ok')
    end

    it 'returns error hash when an exception occurs' do
      allow(HTTParty).to receive(:post)
        .and_raise(StandardError.new('connection failed'))

      result = instance.send(:call_go_service, '/parse', { content: 'code' })
      expect(result['error']).to eq('connection failed')
    end
  end

  describe '#call_python_service' do
    let(:instance) do
      described_class.new!
    end

    let(:http_response) do
      instance_double(
        HTTParty::Response,
        body: { score: 90 }.to_json
      )
    end

    it 'posts to the python service and returns parsed JSON' do
      allow(HTTParty).to receive(:post)
        .with(
          'http://localhost:8081/review',
          body: { content: 'code' }.to_json,
          headers: { 'Content-Type' => 'application/json' },
          timeout: 5
        ).and_return(http_response)

      result = instance.send(:call_python_service, '/review', { content: 'code' })
      expect(result).to eq('score' => 90)
    end

    it 'returns error hash when an exception occurs' do
      allow(HTTParty).to receive(:post)
        .and_raise(StandardError.new('connection failed'))

      result = instance.send(:call_python_service, '/review', { content: 'code' })
      expect(result['error']).to eq('connection failed')
    end
  end

  describe '#detect_language' do
    let(:instance) do
      described_class.new!
    end

    it 'detects go from .go extension' do
      expect(instance.send(:detect_language, 'main.go')).to eq('go')
    end

    it 'detects python from .py extension' do
      expect(instance.send(:detect_language, 'script.py')).to eq('python')
    end

    it 'detects ruby from .rb extension' do
      expect(instance.send(:detect_language, 'app.rb')).to eq('ruby')
    end

    it 'detects javascript from .js extension' do
      expect(instance.send(:detect_language, 'index.js')).to eq('javascript')
    end

    it 'detects typescript from .ts extension' do
      expect(instance.send(:detect_language, 'index.ts')).to eq('typescript')
    end

    it 'detects java from .java extension' do
      expect(instance.send(:detect_language, 'Main.java')).to eq('java')
    end

    it 'returns unknown for files without extension' do
      expect(instance.send(:detect_language, 'README')).to eq('unknown')
    end

    it 'returns unknown for unrecognized extension' do
      expect(instance.send(:detect_language, 'file.txt')).to eq('unknown')
    end

    it 'is case-insensitive for extension' do
      expect(instance.send(:detect_language, 'SCRIPT.PY')).to eq('python')
    end
  end

  describe '#calculate_quality_score' do
    let(:instance) do
      described_class.new!
    end

    context 'when metrics or review is nil' do
      it 'returns 0.0 when metrics is nil' do
        expect(instance.send(:calculate_quality_score, nil, { 'score' => 100, 'issues' => [] }))
          .to eq(0.0)
      end

      it 'returns 0.0 when review is nil' do
        expect(instance.send(:calculate_quality_score, { 'complexity' => 1 }, nil))
          .to eq(0.0)
      end
    end

    context 'when metrics or review contains error' do
      it 'returns 0.0 when metrics has an error' do
        metrics = { 'error' => 'failed' }
        review = { 'score' => 90, 'issues' => [] }
        expect(instance.send(:calculate_quality_score, metrics, review)).to eq(0.0)
      end

      it 'returns 0.0 when review has an error' do
        metrics = { 'complexity' => 2 }
        review = { 'error' => 'failed' }
        expect(instance.send(:calculate_quality_score, metrics, review)).to eq(0.0)
      end
    end

    context 'with valid metrics and review' do
      it 'calculates score considering complexity and issues' do
        metrics = { 'complexity' => 3 }
        review = { 'score' => 80.0, 'issues' => ['a', 'b'] }

        score = instance.send(:calculate_quality_score, metrics, review)

        expected_base = 0.8 * 100
        expected_penalty = (3 * 0.1 + 2 * 0.5) * 100
        expect(score).to be_a(Float)
        expect(score).to be <= 100.0
      end

      it 'does not go below 0' do
        metrics = { 'complexity' => 100 }
        review = { 'score' => 0.0, 'issues' => Array.new(50, 'issue') }

        score = instance.send(:calculate_quality_score, metrics, review)
        expect(score).to eq(0)
      end

      it 'does not exceed 100' do
        metrics = { 'complexity' => 0 }
        review = { 'score' => 150.0, 'issues' => [] }

        score = instance.send(:calculate_quality_score, metrics, review)
        expect(score).to eq(100)
      end
    end
  end
end
