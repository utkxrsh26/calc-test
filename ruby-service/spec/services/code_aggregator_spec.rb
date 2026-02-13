require 'spec_helper'
require_relative '../../app/services/code_aggregator'
require 'json'
require 'httparty'

RSpec.describe CodeAggregator do
  let(:go_url) { 'http://go.example.com' }
  let(:python_url) { 'http://py.example.com' }
  let(:service) { described_class.new(go_url, python_url) }

  before do
    fixed_time = '2023-01-01T00:00:00Z'
    allow(Time).to receive(:now).and_return(double(iso8601: fixed_time))
  end

  describe '#aggregate_analysis' do
    let(:content) { 'puts :hello' }
    let(:path) { 'app/example.rb' }

    context 'when both services succeed' do
      before do
        go_response = double('response', body: { ast: { nodes: 1 }, status: 'ok' }.to_json)
        py_response = double('response', body: { score: 85, issues: ['a', 'b'] }.to_json)

        expect(HTTParty).to receive(:post).with("#{go_url}/parse", satisfy do |args|
          body = JSON.parse(args[:body])
          args[:headers] == { 'Content-Type' => 'application/json' } &&
            body['content'] == content &&
            body['path'] == path
        end).and_return(go_response)

        expect(HTTParty).to receive(:post).with("#{python_url}/review", satisfy do |args|
          body = JSON.parse(args[:body])
          args[:headers] == { 'Content-Type' => 'application/json' } &&
            body['content'] == content &&
            body['language'] == 'ruby'
        end).and_return(py_response)
      end

      it 'returns combined analysis with timestamp, path, language, parsing and review' do
        result = service.aggregate_analysis(content, path)
        expect(result[:timestamp]).to eq('2023-01-01T00:00:00Z')
        expect(result[:file_path]).to eq(path)
        expect(result[:language]).to eq('ruby')
        expect(result[:analysis]['parsing']).to eq({ 'ast' => { 'nodes' => 1 }, 'status' => 'ok' })
        expect(result[:analysis]['review']).to eq({ 'score' => 85, 'issues' => ['a', 'b'] })
      end
    end

    context 'when Go parser fails' do
      before do
        allow(HTTParty).to receive(:post).with("#{go_url}/parse", anything).and_raise(StandardError.new('go unavailable'))
        py_response = double('response', body: { score: 70, issues: [] }.to_json)
        allow(HTTParty).to receive(:post).with("#{python_url}/review", anything).and_return(py_response)
      end

      it 'includes an error for parsing and still returns review' do
        result = service.aggregate_analysis(content, path)
        expect(result[:analysis][:parsing][:error]).to eq('go unavailable')
        expect(result[:analysis]['review']).to eq({ 'score' => 70, 'issues' => [] })
      end

      it 'does not raise an error' do
        expect do
          service.aggregate_analysis(content, path)
        end.not_to raise_error
      end
    end

    context 'when Python reviewer fails' do
      before do
        go_response = double('response', body: { ast: { nodes: 2 } }.to_json)
        allow(HTTParty).to receive(:post).with("#{go_url}/parse", anything).and_return(go_response)
        allow(HTTParty).to receive(:post).with("#{python_url}/review", anything).and_raise(StandardError.new('py timeout'))
      end

      it 'includes an error for review' do
        result = service.aggregate_analysis(content, path)
        expect(result[:analysis]['parsing']).to eq({ 'ast' => { 'nodes' => 2 } })
        expect(result[:analysis][:review][:error]).to eq('py timeout')
      end
    end

    context 'language detection for unknown extension' do
      let(:path) { 'README' }

      before do
        go_response = double('response', body: { ast: {} }.to_json)
        py_response = double('response', body: { score: 50, issues: [] }.to_json)
        allow(HTTParty).to receive(:post).with("#{go_url}/parse", anything).and_return(go_response)
        allow(HTTParty).to receive(:post).with("#{python_url}/review", anything).and_return(py_response)
      end

      it 'sets language to unknown when extension cannot be detected' do
        result = service.aggregate_analysis(content, path)
        expect(result[:language]).to eq('unknown')
      end
    end
  end

  describe '#compare_versions' do
    let(:old_content) { 'old code' }
    let(:new_content) { 'new code' }

    context 'when all services succeed and new version improves' do
      before do
        allow(HTTParty).to receive(:post) do |url, options|
          body = JSON.parse(options[:body])
          if url == "#{go_url}/diff"
            double('response', body: { hunks: 1, added: 5, removed: 2 }.to_json)
          elsif url == "#{python_url}/review"
            if body['content'] == old_content
              double('response', body: { score: 60.0, issues: ['a', 'b', 'c'] }.to_json)
            else
              double('response', body: { score: 80.0, issues: ['a'] }.to_json)
            end
          else
            raise "Unexpected URL #{url}"
          end
        end
      end

      it 'returns comparison with diff, old/new reviews and calculated improvement' do
        result = service.compare_versions(old_content, new_content)
        expect(result[:timestamp]).to eq('2023-01-01T00:00:00Z')
        expect(result[:comparison]['diff']).to eq({ 'hunks' => 1, 'added' => 5, 'removed' => 2 })
        expect(result[:comparison]['old_review']).to eq({ 'score' => 60.0, 'issues' => ['a', 'b', 'c'] })
        expect(result[:comparison]['new_review']).to eq({ 'score' => 80.0, 'issues' => ['a'] })
        expect(result[:improvement][:score_delta]).to eq(20.0)
        expect(result[:improvement][:improvement_percentage]).to eq(33.33)
        expect(result[:improvement][:issues_reduced]).to eq(2)
      end
    end

    context 'when Python review returns error causing improvement calculation to fail' do
      before do
        diff_response = double('response', body: { hunks: 0 }.to_json)
        allow(HTTParty).to receive(:post).with("#{go_url}/diff", anything).and_return(diff_response)
        allow(HTTParty).to receive(:post).with("#{python_url}/review", anything) do |_, options|
          body = JSON.parse(options[:body])
          if body['content'] == old_content
            double('response', body: { error: 'timeout' }.to_json)
          else
            double('response', body: { score: 75.0, issues: [] }.to_json)
          end
        end
      end

      it 'includes improvement error and still returns diff and reviews' do
        result = service.compare_versions(old_content, new_content)
        expect(result[:comparison]['diff']).to eq({ 'hunks' => 0 })
        expect(result[:comparison]['old_review']).to eq({ 'error' => 'timeout' })
        expect(result[:comparison]['new_review']).to eq({ 'score' => 75.0, 'issues' => [] })
        expect(result[:improvement][:error]).to eq('Could not calculate improvement')
      end

      it 'does not raise an error' do
        expect do
          service.compare_versions(old_content, new_content)
        end.not_to raise_error
      end
    end

    context 'when Go diff endpoint raises an error' do
      before do
        allow(HTTParty).to receive(:post).with("#{go_url}/diff", anything).and_raise(StandardError.new('diff failed'))
        allow(HTTParty).to receive(:post).with("#{python_url}/review", anything).and_return(
          double('response', body: { score: 10, issues: [] }.to_json)
        )
      end

      it 'captures diff error and continues processing' do
        result = service.compare_versions(old_content, new_content)
        expect(result[:comparison][:diff][:error]).to eq('diff failed')
        expect(result[:comparison]['old_review']).to eq({ 'score' => 10, 'issues' => [] })
        expect(result[:comparison]['new_review']).to eq({ 'score' => 10, 'issues' => [] })
      end
    end

    context 'when old score is zero' do
      before do
        allow(HTTParty).to receive(:post) do |url, options|
          body = JSON.parse(options[:body])
          if url == "#{go_url}/diff"
            double('response', body: { hunks: 2 }.to_json)
          elsif url == "#{python_url}/review"
            if body['content'] == old_content
              double('response', body: { score: 0.0, issues: ['x'] }.to_json)
            else
              double('response', body: { score: 50.0, issues: [] }.to_json)
            end
          else
            raise "Unexpected URL #{url}"
          end
        end
      end

      it 'sets improvement percentage to 0 to avoid division by zero' do
        result = service.compare_versions(old_content, new_content)
        expect(result[:improvement][:score_delta]).to eq(50.0)
        expect(result[:improvement][:improvement_percentage]).to eq(0)
        expect(result[:improvement][:issues_reduced]).to eq(1)
      end
    end
  end
end
