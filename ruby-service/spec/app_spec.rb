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

    it 'returns 400 when content is missing' do
      post '/analyze', { path: 'file.rb' }.to_json, 'CONTENT_TYPE' => 'application/json'
      expect(last_response.status).to eq(400)
      json_response = JSON.parse(last_response.body)
      expect(json_response['error']).to eq('Missing content')
    end

    it 'falls back to params when JSON is invalid and detects language from path' do
      expect_any_instance_of(PolyglotAPI).to receive(:call_go_service)
        .with('/parse', hash_including(content: 'puts :ok', path: 'test.rb'))
        .and_return({ 'language' => 'ruby', 'lines' => ['puts :ok'] })

      expect_any_instance_of(PolyglotAPI).to receive(:call_python_service)
        .with('/review', hash_including(content: 'puts :ok', language: 'ruby'))
        .and_return({ 'score' => 90, 'issues' => [] })

      post '/analyze?content=puts%20:ok&path=test.rb', 'invalid json', 'CONTENT_TYPE' => 'application/json'
      expect(last_response.status).to eq(200)
      json_response = JSON.parse(last_response.body)
      expect(json_response).to have_key('summary')
      expect(json_response['summary']['language']).to eq('ruby')
    end
  end

  describe 'GET /status' do
    let(:healthy_response) do
      instance_double(HTTParty::Response, code: 200)
    end

    let(:unhealthy_response) do
      instance_double(HTTParty::Response, code: 500)
    end

    it 'reports all services healthy when dependencies return 200' do
      allow(HTTParty).to receive(:get).with('http://localhost:8080/health', timeout: 2).and_return(healthy_response)
      allow(HTTParty).to receive(:get).with('http://localhost:8081/health', timeout: 2).and_return(healthy_response)

      get '/status'
      expect(last_response.status).to eq(200)
      body = JSON.parse(last_response.body)
      expect(body['services']['ruby']['status']).to eq('healthy')
      expect(body['services']['go']['status']).to eq('healthy')
      expect(body['services']['python']['status']).to eq('healthy')
    end

    it 'marks a service as unhealthy when dependency responds non-200' do
      allow(HTTParty).to receive(:get).with('http://localhost:8080/health', timeout: 2).and_return(unhealthy_response)
      allow(HTTParty).to receive(:get).with('http://localhost:8081/health', timeout: 2).and_return(healthy_response)

      get '/status'
      expect(last_response.status).to eq(200)
      body = JSON.parse(last_response.body)
      expect(body['services']['go']['status']).to eq('unhealthy')
      expect(body['services']['python']['status']).to eq('healthy')
    end

    it 'marks a service as unreachable when an exception occurs' do
      allow(HTTParty).to receive(:get).with('http://localhost:8080/health', timeout: 2).and_return(healthy_response)
      allow(HTTParty).to receive(:get).with('http://localhost:8081/health', timeout: 2).and_raise(StandardError.new('timeout'))

      get '/status'
      expect(last_response.status).to eq(200)
      body = JSON.parse(last_response.body)
      expect(body['services']['go']['status']).to eq('healthy')
      expect(body['services']['python']['status']).to eq('unreachable')
      expect(body['services']['python']).to have_key('error')
    end
  end

  describe 'POST /diff' do
    it 'returns diff and new code review for valid request' do
      allow_any_instance_of(PolyglotAPI).to receive(:call_go_service)
        .with('/diff', hash_including(old_content: "a\n", new_content: "b\n"))
        .and_return({ 'changes' => [{ 'op' => 'replace', 'line' => 1 }] })
      allow_any_instance_of(PolyglotAPI).to receive(:call_python_service)
        .with('/review', hash_including(content: "b\n"))
        .and_return({ 'score' => 95, 'issues' => [] })

      post '/diff', { old_content: "a\n", new_content: "b\n" }.to_json, 'CONTENT_TYPE' => 'application/json'
      expect(last_response.status).to eq(200)
      body = JSON.parse(last_response.body)
      expect(body['diff']).to eq({ 'changes' => [{ 'op' => 'replace', 'line' => 1 }] })
      expect(body['new_code_review']).to eq({ 'score' => 95, 'issues' => [] })
    end

    it 'returns 400 when old_content or new_content is missing' do
      post '/diff', { new_content: "b\n" }.to_json, 'CONTENT_TYPE' => 'application/json'
      expect(last_response.status).to eq(400)
      body = JSON.parse(last_response.body)
      expect(body['error']).to eq('Missing old_content or new_content')
    end
  end

  describe 'POST /metrics' do
    it 'returns metrics, review, and computed overall_quality' do
      allow_any_instance_of(PolyglotAPI).to receive(:call_go_service)
        .with('/metrics', hash_including(content: 'x'))
        .and_return({ 'complexity' => 1 })
      allow_any_instance_of(PolyglotAPI).to receive(:call_python_service)
        .with('/review', hash_including(content: 'x'))
        .and_return({ 'score' => 90, 'issues' => ['n1'] })

      post '/metrics', { content: 'x' }.to_json, 'CONTENT_TYPE' => 'application/json'
      expect(last_response.status).to eq(200)
      body = JSON.parse(last_response.body)
      expect(body['metrics']).to eq({ 'complexity' => 1 })
      expect(body['review']).to eq({ 'score' => 90, 'issues' => ['n1'] })
      expect(body['overall_quality']).to eq(30.0)
    end

    it 'returns overall_quality 0 when metrics or review contain errors' do
      allow_any_instance_of(PolyglotAPI).to receive(:call_go_service)
        .and_return({ 'error' => 'boom' })
      allow_any_instance_of(PolyglotAPI).to receive(:call_python_service)
        .and_return({ 'score' => 90, 'issues' => [] })

      post '/metrics', { content: 'x' }.to_json, 'CONTENT_TYPE' => 'application/json'
      expect(last_response.status).to eq(200)
      body = JSON.parse(last_response.body)
      expect(body['overall_quality']).to eq(0)
    end

    it 'returns 400 when content is missing' do
      post '/metrics', {}.to_json, 'CONTENT_TYPE' => 'application/json'
      expect(last_response.status).to eq(400)
      body = JSON.parse(last_response.body)
      expect(body['error']).to eq('Missing content')
    end
  end

  describe '#detect_language' do
    let(:instance) do
      described_class.new
    end

    it 'detects languages based on file extensions' do
      expect(instance.send(:detect_language, 'file.go')).to eq('go')
      expect(instance.send(:detect_language, 'file.py')).to eq('python')
      expect(instance.send(:detect_language, 'file.rb')).to eq('ruby')
      expect(instance.send(:detect_language, 'file.js')).to eq('javascript')
      expect(instance.send(:detect_language, 'file.ts')).to eq('typescript')
      expect(instance.send(:detect_language, 'file.java')).to eq('java')
    end

    it 'returns unknown for unrecognized extensions (case-insensitive)' do
      expect(instance.send(:detect_language, 'file.UNKNOWN')).to eq('unknown')
      expect(instance.send(:detect_language, 'no_extension')).to eq('unknown')
    end
  end

  describe '#calculate_quality_score' do
    let(:instance) do
      described_class.new
    end

    it 'returns 0.0 when inputs are nil or contain errors' do
      expect(instance.send(:calculate_quality_score, nil, nil)).to eq(0.0)
      expect(instance.send(:calculate_quality_score, { 'complexity' => 1 }, { 'error' => 'x' })).to eq(0.0)
      expect(instance.send(:calculate_quality_score, { 'error' => 'x' }, { 'score' => 100, 'issues' => [] })).to eq(0.0)
    end

    it 'computes rounded score without penalties' do
      score = instance.send(:calculate_quality_score, { 'complexity' => 0 }, { 'score' => 85.55, 'issues' => [] })
      expect(score).to eq(85.55)
    end

    it 'clamps score between 0 and 100' do
      high = instance.send(:calculate_quality_score, { 'complexity' => 0 }, { 'score' => 150, 'issues' => [] })
      low = instance.send(:calculate_quality_score, { 'complexity' => 10 }, { 'score' => 0, 'issues' => Array.new(10, 'x') })
      expect(high).to eq(100)
      expect(low).to eq(0)
    end
  end

  describe '#call_go_service' do
    let(:instance) do
      described_class.new
    end

    it 'parses JSON body on success' do
      response = instance_double(HTTParty::Response, body: { ok: true }.to_json)
      allow(HTTParty).to receive(:post).and_return(response)
      result = instance.send(:call_go_service, '/test', { a: 1 })
      expect(result).to eq('ok' => true)
    end

    it 'returns error hash on exception' do
      allow(HTTParty).to receive(:post).and_raise(StandardError.new('network'))
      result = instance.send(:call_go_service, '/test', { a: 1 })
      expect(result).to eq({ error: 'network' })
    end
  end

  describe '#call_python_service' do
    let(:instance) do
      described_class.new
    end

    it 'parses JSON body on success' do
      response = instance_double(HTTParty::Response, body: { ok: 'py' }.to_json)
      allow(HTTParty).to receive(:post).and_return(response)
      result = instance.send(:call_python_service, '/review', { x: 1 })
      expect(result).to eq('ok' => 'py')
    end

    it 'returns error hash on exception' do
      allow(HTTParty).to receive(:post).and_raise(StandardError.new('py-down'))
      result = instance.send(:call_python_service, '/review', { x: 1 })
      expect(result).to eq({ error: 'py-down' })
    end
  end
end
