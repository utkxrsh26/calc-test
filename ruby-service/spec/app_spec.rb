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
    it 'returns healthy statuses for all services' do
      go_response = instance_double(HTTParty::Response, code: 200)
      py_response = instance_double(HTTParty::Response, code: 200)

      allow(HTTParty).to receive(:get).with('http://localhost:8080/health', timeout: 2).and_return(go_response)
      allow(HTTParty).to receive(:get).with('http://localhost:8081/health', timeout: 2).and_return(py_response)

      get '/status'

      expect(last_response.status).to eq(200)
      json = JSON.parse(last_response.body)
      expect(json['services']['ruby']['status']).to eq('healthy')
      expect(json['services']['go']['status']).to eq('healthy')
      expect(json['services']['python']['status']).to eq('healthy')
    end

    it 'marks a service as unhealthy when it returns non-200' do
      go_response = instance_double(HTTParty::Response, code: 500)
      py_response = instance_double(HTTParty::Response, code: 200)

      allow(HTTParty).to receive(:get).with('http://localhost:8080/health', timeout: 2).and_return(go_response)
      allow(HTTParty).to receive(:get).with('http://localhost:8081/health', timeout: 2).and_return(py_response)

      get '/status'

      expect(last_response.status).to eq(200)
      json = JSON.parse(last_response.body)
      expect(json['services']['go']['status']).to eq('unhealthy')
      expect(json['services']['python']['status']).to eq('healthy')
    end

    it 'marks a service as unreachable when an error occurs' do
      go_response = instance_double(HTTParty::Response, code: 200)

      allow(HTTParty).to receive(:get).with('http://localhost:8080/health', timeout: 2).and_return(go_response)
      allow(HTTParty).to receive(:get).with('http://localhost:8081/health', timeout: 2).and_raise(StandardError.new('connection failed'))

      get '/status'

      expect(last_response.status).to eq(200)
      json = JSON.parse(last_response.body)
      expect(json['services']['python']['status']).to eq('unreachable')
      expect(json['services']['python']['error']).to match(/connection failed/)
    end
  end

  describe 'POST /analyze additional cases' do
    it 'returns 400 when content is missing' do
      post '/analyze', { path: 'test.py' }.to_json, 'CONTENT_TYPE' => 'application/json'
      expect(last_response.status).to eq(400)
      json = JSON.parse(last_response.body)
      expect(json['error']).to eq('Missing content')
    end

    it 'passes detected language to python service based on file extension' do
      allow_any_instance_of(PolyglotAPI).to receive(:call_go_service)
        .and_return({ 'language' => 'python', 'lines' => ['def x(): pass'] })
      expect_any_instance_of(PolyglotAPI).to receive(:call_python_service)
        .with('/review', hash_including(content: 'print(1)', language: 'python'))
        .and_return({ 'score' => 70, 'issues' => [] })

      post '/analyze', { content: 'print(1)', path: 'file.py' }.to_json, 'CONTENT_TYPE' => 'application/json'
      expect(last_response.status).to eq(200)
      json = JSON.parse(last_response.body)
      expect(json['summary']).to include('review_score' => 70)
    end
  end

  describe 'POST /diff' do
    it 'returns diff and new code review when inputs are valid' do
      diff_payload = { 'changes' => ['+ new line', '- old line'] }
      review_payload = { 'score' => 88, 'issues' => ['nit'] }

      allow_any_instance_of(PolyglotAPI).to receive(:call_go_service)
        .with('/diff', hash_including(old_content: 'old', new_content: 'new'))
        .and_return(diff_payload)
      allow_any_instance_of(PolyglotAPI).to receive(:call_python_service)
        .with('/review', hash_including(content: 'new'))
        .and_return(review_payload)

      post '/diff', { old_content: 'old', new_content: 'new' }.to_json, 'CONTENT_TYPE' => 'application/json'

      expect(last_response.status).to eq(200)
      json = JSON.parse(last_response.body)
      expect(json['diff']).to eq(diff_payload)
      expect(json['new_code_review']).to eq(review_payload)
    end

    it 'returns 400 when required params are missing' do
      post '/diff', {}.to_json, 'CONTENT_TYPE' => 'application/json'
      expect(last_response.status).to eq(400)
      json = JSON.parse(last_response.body)
      expect(json['error']).to eq('Missing old_content or new_content')
    end
  end

  describe 'POST /metrics' do
    it 'returns metrics, review, and calculated overall quality' do
      metrics_payload = { 'complexity' => 1 }
      review_payload = { 'score' => 90, 'issues' => ['minor'] } # base 0.9 - (0.1 + 0.5) = 0.3 => 30.0

      allow_any_instance_of(PolyglotAPI).to receive(:call_go_service)
        .with('/metrics', hash_including(content: 'code here'))
        .and_return(metrics_payload)
      allow_any_instance_of(PolyglotAPI).to receive(:call_python_service)
        .with('/review', hash_including(content: 'code here'))
        .and_return(review_payload)

      post '/metrics', { content: 'code here' }.to_json, 'CONTENT_TYPE' => 'application/json'

      expect(last_response.status).to eq(200)
      json = JSON.parse(last_response.body)
      expect(json['metrics']).to eq(metrics_payload)
      expect(json['review']).to eq(review_payload)
      expect(json['overall_quality']).to eq(30.0)
    end

    it 'returns 400 when content is missing' do
      post '/metrics', {}.to_json, 'CONTENT_TYPE' => 'application/json'
      expect(last_response.status).to eq(400)
      json = JSON.parse(last_response.body)
      expect(json['error']).to eq('Missing content')
    end

    it 'sets overall quality to 0.0 when metrics has error' do
      metrics_payload = { 'error' => 'timeout' }
      review_payload = { 'score' => 100, 'issues' => [] }

      allow_any_instance_of(PolyglotAPI).to receive(:call_go_service)
        .and_return(metrics_payload)
      allow_any_instance_of(PolyglotAPI).to receive(:call_python_service)
        .and_return(review_payload)

      post '/metrics', { content: 'x' }.to_json, 'CONTENT_TYPE' => 'application/json'

      expect(last_response.status).to eq(200)
      json = JSON.parse(last_response.body)
      expect(json['overall_quality']).to eq(0.0)
    end

    it 'sets overall quality to 0.0 when review has error' do
      metrics_payload = { 'complexity' => 0 }
      review_payload = { 'error' => 'service unavailable' }

      allow_any_instance_of(PolyglotAPI).to receive(:call_go_service)
        .and_return(metrics_payload)
      allow_any_instance_of(PolyglotAPI).to receive(:call_python_service)
        .and_return(review_payload)

      post '/metrics', { content: 'y' }.to_json, 'CONTENT_TYPE' => 'application/json'

      expect(last_response.status).to eq(200)
      json = JSON.parse(last_response.body)
      expect(json['overall_quality']).to eq(0.0)
    end

    it 'clamps overall quality to 100 when penalties are zero and score is 100' do
      metrics_payload = {}
      review_payload = { 'score' => 100, 'issues' => [] }

      allow_any_instance_of(PolyglotAPI).to receive(:call_go_service)
        .and_return(metrics_payload)
      allow_any_instance_of(PolyglotAPI).to receive(:call_python_service)
        .and_return(review_payload)

      post '/metrics', { content: 'z' }.to_json, 'CONTENT_TYPE' => 'application/json'

      expect(last_response.status).to eq(200)
      json = JSON.parse(last_response.body)
      expect(json['overall_quality']).to eq(100)
    end
  end
end
