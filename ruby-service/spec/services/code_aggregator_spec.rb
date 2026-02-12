require 'spec_helper'
require_relative '../../app/services/code_aggregator'

RSpec.describe CodeAggregator do
  let(:go_url) { 'http://go.example.com' }
  let(:py_url) { 'http://py.example.com' }
  let(:service) { described_class.new(go_url, py_url) }

  before do
    allow(Time).to receive(:now).and_return(Time.new(2023, 1, 1, 12, 0, 0, '+00:00'))
  end

  describe '#aggregate_analysis' do
    let(:content) { 'puts :hello' }
    let(:path) { 'app/models/user.rb' }

    before do
      allow(HTTParty).to receive(:post) do |url, options|
        if url == "#{go_url}/parse"
          body = { 'ast' => { 'nodes' => 3 } }.to_json
          double(body: body)
        elsif url == "#{py_url}/review"
          req = JSON.parse(options[:body])
          body = { 'language' => req['language'], 'score' => 88, 'issues' => [{ 'id' => 1 }] }.to_json
          double(body: body)
        else
          raise "Unexpected URL #{url}"
        end
      end
    end

    it 'aggregates parsing and review with language detection and timestamp' do
      result = service.aggregate_analysis(content, path)
      expect(result[:timestamp]).to eq('2023-01-01T12:00:00+00:00')
      expect(result[:file_path]).to eq(path)
      expect(result[:language]).to eq('ruby')
      expect(result[:analysis]['parsing']).to eq({ 'ast' => { 'nodes' => 3 } })
      expect(result[:analysis]['review']).to include('language' => 'ruby', 'score' => 88)
    end

    context 'when Go parse API fails' do
      before do
        allow(HTTParty).to receive(:post) do |url, options|
          if url == "#{go_url}/parse"
            raise StandardError, 'parse failed'
          elsif url == "#{py_url}/review"
            double(body: { ok: true }.to_json)
          else
            raise "Unexpected URL #{url}"
          end
        end
      end

      it 'returns error hash for parsing and still returns review' do
        result = service.aggregate_analysis(content, path)
        expect(result[:analysis]['parsing']).to include('error' => 'parse failed')
        expect(result[:analysis]['review']).to include('ok' => true)
      end
    end

    context 'when Python review API fails' do
      before do
        allow(HTTParty).to receive(:post) do |url, options|
          if url == "#{py_url}/review"
            raise StandardError, 'review failed'
          elsif url == "#{go_url}/parse"
            double(body: { parsed: true }.to_json)
          else
            raise "Unexpected URL #{url}"
          end
        end
      end

      it 'returns error hash for review and still returns parse' do
        result = service.aggregate_analysis(content, path)
        expect(result[:analysis]['review']).to include('error' => 'review failed')
        expect(result[:analysis]['parsing']).to include('parsed' => true)
      end
    end

    context 'when Go parse API returns invalid JSON' do
      before do
        allow(HTTParty).to receive(:post) do |url, options|
          if url == "#{go_url}/parse"
            double(body: 'not-json')
          elsif url == "#{py_url}/review"
            double(body: { ok: true }.to_json)
          else
            raise "Unexpected URL #{url}"
          end
        end
      end

      it 'rescues JSON parse error and returns error message' do
        result = service.aggregate_analysis(content, path)
        expect(result[:analysis]['parsing']).to have_key('error')
        expect(result[:analysis]['review']).to include('ok' => true)
      end
    end

    it 'passes "unknown" language to python review when path has unknown extension' do
      unknown_path = 'README.txt'
      captured_languages = []
      allow(HTTParty).to receive(:post) do |url, options|
        if url == "#{py_url}/review"
          req = JSON.parse(options[:body])
          captured_languages << req['language']
          double(body: { ok: true }.to_json)
        elsif url == "#{go_url}/parse"
          double(body: { ok: true }.to_json)
        else
          raise "Unexpected URL #{url}"
        end
      end
      service.aggregate_analysis(content, unknown_path)
      expect(captured_languages).to eq(['unknown'])
    end
  end

  describe '#compare_versions' do
    context 'when all external APIs succeed' do
      let(:old_content) { 'old code' }
      let(:new_content) { 'new code' }

      before do
        allow(HTTParty).to receive(:post) do |url, options|
          if url == "#{go_url}/diff"
            double(body: { 'changes' => { 'added' => 1, 'removed' => 2 } }.to_json)
          elsif url == "#{py_url}/review"
            req = JSON.parse(options[:body])
            if req['content'] == 'old code'
              double(body: { 'language' => req['language'], 'score' => 50.0, 'issues' => [1, 2, 3] }.to_json)
            elsif req['content'] == 'new code'
              double(body: { 'language' => req['language'], 'score' => 75.0, 'issues' => [1] }.to_json)
            else
              raise "Unexpected review content #{req['content']}"
            end
          else
            raise "Unexpected URL #{url}"
          end
        end
      end

      it 'returns diff, old/new reviews, and calculated improvement' do
        result = service.compare_versions(old_content, new_content)
        expect(result[:timestamp]).to eq('2023-01-01T12:00:00+00:00')
        expect(result[:comparison]['diff']).to eq({ 'changes' => { 'added' => 1, 'removed' => 2 } })
        expect(result[:comparison]['old_review']).to include('language' => 'unknown', 'score' => 50.0, 'issues' => [1, 2, 3])
        expect(result[:comparison]['new_review']).to include('language' => 'unknown', 'score' => 75.0, 'issues' => [1])
        expect(result[:improvement]).to include(score_delta: 25.0, improvement_percentage: 50.0, issues_reduced: 2)
      end
    end

    context 'when diff API fails and improvement cannot be calculated' do
      let(:old_content) { 'bad code' }
      let(:new_content) { 'ok code' }

      before do
        allow(HTTParty).to receive(:post) do |url, options|
          if url == "#{go_url}/diff"
            raise StandardError, 'diff failed'
          elsif url == "#{py_url}/review"
            req = JSON.parse(options[:body])
            if req['content'] == 'bad code'
              raise StandardError, 'py review failed'
            elsif req['content'] == 'ok code'
              double(body: { 'score' => 10, 'issues' => [] }.to_json)
            else
              double(body: { 'score' => 0, 'issues' => [] }.to_json)
            end
          else
            raise "Unexpected URL #{url}"
          end
        end
      end

      it 'embeds error in diff result and returns improvement error' do
        result = service.compare_versions(old_content, new_content)
        expect(result[:comparison]['diff']).to include('error' => 'diff failed')
        expect(result[:comparison]['old_review']).to include('error' => 'py review failed')
        expect(result[:improvement]).to eq({ error: 'Could not calculate improvement' })
      end
    end

    context 'when old score is zero, improvement percentage is zero' do
      let(:old_content) { 'zero score' }
      let(:new_content) { 'some score' }

      before do
        allow(HTTParty).to receive(:post) do |url, options|
          if url == "#{go_url}/diff"
            double(body: { 'ok' => true }.to_json)
          elsif url == "#{py_url}/review"
            req = JSON.parse(options[:body])
            if req['content'] == 'zero score'
              double(body: { 'score' => 0, 'issues' => [] }.to_json)
            elsif req['content'] == 'some score'
              double(body: { 'score' => 10, 'issues' => [1, 2] }.to_json)
            else
              double(body: { 'score' => 0, 'issues' => [] }.to_json)
            end
          else
            raise "Unexpected URL #{url}"
          end
        end
      end

      it 'returns zero improvement percentage and correct deltas' do
        result = service.compare_versions(old_content, new_content)
        expect(result[:improvement]).to include(score_delta: 10, improvement_percentage: 0, issues_reduced: 0 - 2)
      end
    end

    context 'when review API returns invalid JSON for old review' do
      let(:old_content) { 'old code' }
      let(:new_content) { 'new code' }

      before do
        allow(HTTParty).to receive(:post) do |url, options|
          if url == "#{go_url}/diff"
            double(body: { 'ok' => true }.to_json)
          elsif url == "#{py_url}/review"
            req = JSON.parse(options[:body])
            if req['content'] == 'old code'
              double(body: 'invalid-json')
            elsif req['content'] == 'new code'
              double(body: { 'score' => 20, 'issues' => [] }.to_json)
            else
              double(body: { 'score' => 0, 'issues' => [] }.to_json)
            end
          else
            raise "Unexpected URL #{url}"
          end
        end
      end

      it 'returns error for old_review and improvement error' do
        result = service.compare_versions(old_content, new_content)
        expect(result[:comparison]['old_review']).to have_key('error')
        expect(result[:improvement]).to eq({ error: 'Could not calculate improvement' })
      end
    end
  end
end
