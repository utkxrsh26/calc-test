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
    let(:go_url) do
      PolyglotAPI.settings.go_service_url
    end

    let(:python_url) do
      PolyglotAPI.settings.python_service_url
    end

    context 'when all services are healthy' do
      it 'returns healthy status for all services' do
        ok_response = instance_double(HTTParty::Response, code: 200)
        allow(HTTParty).to receive(:get).with("#{go_url}/health", timeout: 2).and_return(ok_response)
        allow(HTTParty).to receive(:get).with("#{python_url}/health", timeout: 2).and_return(ok_response)

        get '/status'
        expect(last_response.status).to eq(200)
        json_response = JSON.parse(last_response.body)
        expect(json_response['services']['ruby']['status']).to eq('healthy')
        expect(json_response['services']['go']['status']).to eq('healthy')
        expect(json_response['services']['python']['status']).to eq('healthy')
      end
    end

    context 'when a dependency is unreachable' do
      it 'marks the service as unreachable with error' do
        ok_response = instance_double(HTTParty::Response, code: 200)
        allow(HTTParty).to receive(:get).with("#{go_url}/health", timeout: 2).and_return(ok_response)
        allow(HTTParty).to receive(:get).with("#{python_url}/health", timeout: 2).and_raise(StandardError.new('timeout'))

        get '/status'
        expect(last_response.status).to eq(200)
        json_response = JSON.parse(last_response.body)
        expect(json_response['services']['go']['status']).to eq('healthy')
        expect(json_response['services']['python']['status']).to eq('unreachable')
        expect(json_response['services']['python']['error']).to include('timeout')
      end
    end

    context 'when a dependency returns non-200' do
      it 'marks the service as unhealthy' do
        bad_response = instance_double(HTTParty::Response, code: 500)
        allow(HTTParty).to receive(:get).with("#{go_url}/health", timeout: 2).and_return(bad_response)
        allow(HTTParty).to receive(:get).with("#{python_url}/health", timeout: 2).and_return(bad_response)

        get '/status'
        expect(last_response.status).to eq(200)
        json_response = JSON.parse(last_response.body)
        expect(json_response['services']['go']['status']).to eq('unhealthy')
        expect(json_response['services']['python']['status']).to eq('unhealthy')
      end
    end
  end

  describe 'POST /diff' do
    let(:headers) do
      { 'CONTENT_TYPE' => 'application/json' }
    end

    context 'when required params are missing' do
      it 'returns 400 with error' do
        post '/diff', { old_content: 'old' }.to_json, headers
        expect(last_response.status).to eq(400)
        json_response = JSON.parse(last_response.body)
        expect(json_response['error']).to eq('Missing old_content or new_content')
      end
    end

    context 'when valid request is provided' do
      it 'returns diff and new code review' do
        allow_any_instance_of(PolyglotAPI).to receive(:call_go_service)
          .with('/diff', hash_including(old_content: 'old', new_content: 'new'))
          .and_return({ 'changes' => [{ 'op' => 'add', 'line' => 1 }] })
        allow_any_instance_of(PolyglotAPI).to receive(:call_python_service)
          .with('/review', hash_including(content: 'new'))
          .and_return({ 'score' => 92, 'issues' => [] })

        post '/diff', { old_content: 'old', new_content: 'new' }.to_json, headers
        expect(last_response.status).to eq(200)
        body = JSON.parse(last_response.body)
        expect(body).to have_key('diff')
        expect(body).to have_key('new_code_review')
        expect(body['diff']).to eq({ 'changes' => [{ 'op' => 'add', 'line' => 1 }] })
        expect(body['new_code_review']['score']).to eq(92)
      end
    end
  end

  describe 'POST /metrics' do
    let(:headers) do
      { 'CONTENT_TYPE' => 'application/json' }
    end

    context 'when content is missing' do
      it 'returns 400 with error' do
        post '/metrics', {}.to_json, headers
        expect(last_response.status).to eq(400)
        json_response = JSON.parse(last_response.body)
        expect(json_response['error']).to eq('Missing content')
      end
    end

    context 'when valid request is provided' do
      it 'returns metrics, review, and overall_quality' do
        metrics = { 'complexity' => 1 }
        review = { 'score' => 90, 'issues' => ['nit'] }

        allow_any_instance_of(PolyglotAPI).to receive(:call_go_service)
          .with('/metrics', hash_including(content: 'code here'))
          .and_return(metrics)
        allow_any_instance_of(PolyglotAPI).to receive(:call_python_service)
          .with('/review', hash_including(content: 'code here'))
          .and_return(review)

        post '/metrics', { content: 'code here' }.to_json, headers
        expect(last_response.status).to eq(200)
        body = JSON.parse(last_response.body)
        expect(body['metrics']).to eq(metrics)
        expect(body['review']).to eq(review)
        expect(body['overall_quality']).to eq(30)
      end
    end
  end
end
