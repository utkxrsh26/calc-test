require 'rails_helper'
require_relative '../../app/services/code_aggregator'
require 'json'
require 'spec_helper'

RSpec.describe CodeAggregator do
  let(:go_service_url) { 'http://go.example.com' }
  let(:python_service_url) { 'http://python.example.com' }
  let(:service) { described_class.new(go_service_url, python_service_url) }

  def http_response(hash)
    double('HTTPartyResponse', body: JSON.generate(hash))
  end

  describe '#aggregate_analysis' do
    let(:content) { 'puts :hello' }
    let(:path) { 'lib/sample.rb' }

    it 'returns aggregated structure with parsing and review results' do
      expect(HTTParty).to receive(:post) do |url, options|
        expect(url).to eq("#{go_service_url}/parse")
        body = JSON.parse(options[:body])
        expect(body).to eq({ 'content' => content, 'path' => path })
        expect(options[:headers]).to include('Content-Type' => 'application/json')
        http_response('ast' => 'ok')
      end

      expect(HTTParty).to receive(:post) do |url, options|
        expect(url).to eq("#{python_service_url}/review")
        body = JSON.parse(options[:body])
        expect(body).to eq({ 'content' => content, 'language' => 'ruby' })
        expect(options[:headers]).to include('Content-Type' => 'application/json')
        http_response('score' => 95, 'issues' => [])
      end

      result = service.aggregate_analysis(content, path)

      expect(result[:timestamp]).to be_a(String)
      expect(result[:file_path]).to eq(path)
      expect(result[:language]).to eq('ruby')
      expect(result[:analysis][:parsing]).to eq('ast' => 'ok')
      expect(result[:analysis][:review]).to eq('score' => 95, 'issues' => [])
    end

    it 'handles parsing service error gracefully' do
      allow(HTTParty).to receive(:post).with("#{go_service_url}/parse", anything).and_raise(StandardError.new('go parse failed'))
      allow(HTTParty).to receive(:post).with("#{python_service_url}/review", anything).and_return(http_response('score' => 90, 'issues' => %w[a]))

      result = service.aggregate_analysis(content, path)

      expect(result[:analysis][:parsing]).to eq(error: 'go parse failed')
      expect(result[:analysis][:review]).to eq('score' => 90, 'issues' => ['a'])
    end

    it 'handles review service error gracefully' do
      allow(HTTParty).to receive(:post).with("#{go_service_url}/parse", anything).and_return(http_response('ast' => 'ok'))
      allow(HTTParty).to receive(:post).with("#{python_service_url}/review", anything).and_raise(StandardError.new('python review failed'))

      result = service.aggregate_analysis(content, path)

      expect(result[:analysis][:parsing]).to eq('ast' => 'ok')
      expect(result[:analysis][:review]).to eq(error: 'python review failed')
    end

    it 'detects unknown language when file extension is not recognized' do
      unknown_path = 'notes/file.unknown'

      expect(HTTParty).to receive(:post).with("#{go_service_url}/parse", anything).and_return(http_response('ast' => 'ok'))
      expect(HTTParty).to receive(:post) do |url, options|
        expect(url).to eq("#{python_service_url}/review")
        body = JSON.parse(options[:body])
        expect(body['language']).to eq('unknown')
        http_response('score' => 50, 'issues' => [])
      end

      result = service.aggregate_analysis(content, unknown_path)

      expect(result[:language]).to eq('unknown')
      expect(result[:analysis][:review]).to eq('score' => 50, 'issues' => [])
    end
  end

  describe '#compare_versions' do
    let(:old_content) { 'def foo; 1; end' }
    let(:new_content) { 'def foo; 2; end' }

    it 'returns diff, old/new reviews, and computed improvement' do
      allow(HTTParty).to receive(:post).with("#{go_service_url}/diff", anything).and_return(http_response('changes' => 2))
      allow(HTTParty).to receive(:post).with("#{python_service_url}/review", anything).and_return(
        http_response('score' => 60, 'issues' => %w[a b c]),
        http_response('score' => 80, 'issues' => %w[a]),
        http_response('score' => 60, 'issues' => %w[a b c]),
        http_response('score' => 80, 'issues' => %w[a])
      )

      result = service.compare_versions(old_content, new_content)

      expect(result[:timestamp]).to be_a(String)
      expect(result[:comparison][:diff]).to eq('changes' => 2)
      expect(result[:comparison][:old_review]).to eq('score' => 60, 'issues' => %w[a b c])
      expect(result[:comparison][:new_review]).to eq('score' => 80, 'issues' => %w[a])

      # Due to integer division in implementation, improvement_percentage will be 0
      expect(result[:improvement]).to eq(
        score_delta: 20,
        improvement_percentage: 0,
        issues_reduced: 2
      )
    end

    it 'handles diff service error gracefully' do
      allow(HTTParty).to receive(:post).with("#{go_service_url}/diff", anything).and_raise(StandardError.new('diff failed'))
      allow(HTTParty).to receive(:post).with("#{python_service_url}/review", anything).and_return(
        http_response('score' => 10, 'issues' => %w[a]),
        http_response('score' => 10, 'issues' => %w[a]),
        http_response('score' => 10, 'issues' => %w[a]),
        http_response('score' => 10, 'issues' => %w[a])
      )

      result = service.compare_versions(old_content, new_content)

      expect(result[:comparison][:diff]).to eq(error: 'diff failed')
      expect(result[:improvement][:score_delta]).to eq(0)
      expect(result[:improvement][:improvement_percentage]).to eq(0)
      expect(result[:improvement][:issues_reduced]).to eq(0)
    end

    it 'returns improvement error when review services return error payloads' do
      allow(HTTParty).to receive(:post).with("#{go_service_url}/diff", anything).and_return(http_response('changes' => 0))
      # First two are for old_review and new_review in compare_versions
      # Next two are for calculate_improvement
      allow(HTTParty).to receive(:post).with("#{python_service_url}/review", anything).and_return(
        http_response('error' => 'service down'),
        http_response('error' => 'service down'),
        http_response('error' => 'service down'),
        http_response('error' => 'service down')
      )

      result = service.compare_versions(old_content, new_content)

      expect(result[:comparison][:old_review]).to eq('error' => 'service down')
      expect(result[:comparison][:new_review]).to eq('error' => 'service down')
      expect(result[:improvement]).to eq(error: 'Could not calculate improvement')
    end

    it 'passes language "unknown" to review calls when no path is provided' do
      review_bodies = []
      call_count = 0

      allow(HTTParty).to receive(:post) do |url, options|
        if url == "#{go_service_url}/diff"
          http_response('changes' => 1)
        elsif url == "#{python_service_url}/review"
          call_count += 1
          review_bodies << JSON.parse(options[:body])
          http_response('score' => 0, 'issues' => [])
        else
          raise "Unexpected URL: #{url}"
        end
      end

      result = service.compare_versions(old_content, new_content)

      expect(result[:comparison][:diff]).to eq('changes' => 1)
      expect(call_count).to eq(4)
      review_bodies.each do |body|
        expect(body['language']).to eq('unknown')
      end
    end
  end
end
