require 'rails_helper'
require_relative '../../app/services/code_aggregator'
require 'spec_helper'

RSpec.describe CodeAggregator do
  let(:go_service_url) do
    'http://go-service.test'
  end

  let(:python_service_url) do
    'http://python-service.test'
  end

  let(:service) do
    described_class.new(go_service_url, python_service_url)
  end

  describe '#aggregate_analysis' do
    let(:content) do
      "def hello\n  puts 'hello'\end\n"
    end

    let(:path) do
      'app/models/user.rb'
    end

    let(:parsed_response_body) do
      { 'ast' => { 'type' => 'Program' } }
    end

    let(:parsed_response) do
      instance_double(HTTParty::Response, body: parsed_response_body.to_json)
    end

    let(:review_response_body) do
      {
        'score' => 80.5,
        'issues' => [
          { 'line' => 1, 'message' => 'Example issue' }
        ]
      }
    end

    let(:review_response) do
      instance_double(HTTParty::Response, body: review_response_body.to_json)
    end

    before do
      allow(Time).to receive(:now).and_return(Time.utc(2024, 1, 2, 3, 4, 5))

      allow(HTTParty).to receive(:post).with(
        "#{go_service_url}/parse",
        body: { content: content, path: path }.to_json,
        headers: { 'Content-Type' => 'application/json' }
      ).and_return(parsed_response)

      allow(HTTParty).to receive(:post).with(
        "#{python_service_url}/review",
        body: { content: content, language: 'ruby' }.to_json,
        headers: { 'Content-Type' => 'application/json' }
      ).and_return(review_response)
    end

    it 'returns a structured hash with timestamp, file_path, language, and analysis' do
      result = service.aggregate_analysis(content, path)

      expect(result[:timestamp]).to eq('2024-01-02T03:04:05Z')
      expect(result[:file_path]).to eq(path)
      expect(result[:language]).to eq('ruby')

      expect(result[:analysis][:parsing]).to eq(parsed_response_body)
      expect(result[:analysis][:review]).to eq(review_response_body)
    end

    it 'detects language based on file extension' do
      result = service.aggregate_analysis(content, 'foo.go')
      expect(result[:language]).to eq('go')
    end

    context 'when the Go parse service raises an error' do
      before do
        allow(HTTParty).to receive(:post).with(
          "#{go_service_url}/parse",
          body: { content: content, path: path }.to_json,
          headers: { 'Content-Type' => 'application/json' }
        ).and_raise(StandardError.new('parse failure'))
      end

      it 'returns an error hash for parsing but still calls python review' do
        result = service.aggregate_analysis(content, path)

        expect(result[:analysis][:parsing]).to eq({ error: 'parse failure' })
        expect(result[:analysis][:review]).to eq(review_response_body)
      end
    end

    context 'when the Python review service raises an error' do
      before do
        allow(HTTParty).to receive(:post).with(
          "#{python_service_url}/review",
          body: { content: content, language: 'ruby' }.to_json,
          headers: { 'Content-Type' => 'application/json' }
        ).and_raise(StandardError.new('review failure'))
      end

      it 'returns an error hash for review but still calls Go parse' do
        result = service.aggregate_analysis(content, path)

        expect(result[:analysis][:parsing]).to eq(parsed_response_body)
        expect(result[:analysis][:review]).to eq({ error: 'review failure' })
      end
    end
  end

  describe '#compare_versions' do
    let(:old_content) do
      "puts 'old'\n"
    end

    let(:new_content) do
      "puts 'new'\n"
    end

    let(:diff_response_body) do
      { 'diff' => '@@ -1 +1 @@' }
    end

    let(:diff_response) do
      instance_double(HTTParty::Response, body: diff_response_body.to_json)
    end

    let(:old_review_body) do
      {
        'score' => 50.0,
        'issues' => [
          { 'line' => 1, 'message' => 'Too old' }
        ]
      }
    end

    let(:old_review_response) do
      instance_double(HTTParty::Response, body: old_review_body.to_json)
    end

    let(:new_review_body) do
      {
        'score' => 90.0,
        'issues' => [
          { 'line' => 1, 'message' => 'Still something' }
        ]
      }
    end

    let(:new_review_response) do
      instance_double(HTTParty::Response, body: new_review_body.to_json)
    end

    before do
      allow(Time).to receive(:now).and_return(Time.utc(2024, 6, 7, 8, 9, 10))

      allow(HTTParty).to receive(:post).with(
        "#{go_service_url}/diff",
        body: { old_content: old_content, new_content: new_content }.to_json,
        headers: { 'Content-Type' => 'application/json' }
      ).and_return(diff_response)

      allow(HTTParty).to receive(:post).with(
        "#{python_service_url}/review",
        body: { content: old_content, language: 'unknown' }.to_json,
        headers: { 'Content-Type' => 'application/json' }
      ).and_return(old_review_response)

      allow(HTTParty).to receive(:post).with(
        "#{python_service_url}/review",
        body: { content: new_content, language: 'unknown' }.to_json,
        headers: { 'Content-Type' => 'application/json' }
      ).and_return(new_review_response)
    end

    it 'returns diff, reviews and improvement data' do
      result = service.compare_versions(old_content, new_content)

      expect(result[:timestamp]).to eq('2024-06-07T08:09:10Z')

      expect(result[:comparison][:diff]).to eq(diff_response_body)
      expect(result[:comparison][:old_review]).to eq(old_review_body)
      expect(result[:comparison][:new_review]).to eq(new_review_body)

      improvement = result[:improvement]
      expect(improvement[:score_delta]).to eq(40.0)
      expect(improvement[:improvement_percentage]).to eq(80.0)
      expect(improvement[:issues_reduced]).to eq(0)
    end

    context 'when diff service raises an error' do
      before do
        allow(HTTParty).to receive(:post).with(
          "#{go_service_url}/diff",
          body: { old_content: old_content, new_content: new_content }.to_json,
          headers: { 'Content-Type' => 'application/json' }
        ).and_raise(StandardError.new('diff failure'))
      end

      it 'returns an error hash for diff but still computes improvement' do
        result = service.compare_versions(old_content, new_content)

        expect(result[:comparison][:diff]).to eq({ error: 'diff failure' })

        improvement = result[:improvement]
        expect(improvement[:score_delta]).to eq(40.0)
        expect(improvement[:improvement_percentage]).to eq(80.0)
      end
    end

    context 'when old review request fails' do
      before do
        allow(HTTParty).to receive(:post).with(
          "#{python_service_url}/review",
          body: { content: old_content, language: 'unknown' }.to_json,
          headers: { 'Content-Type' => 'application/json' }
        ).and_raise(StandardError.new('old review failure'))
      end

      it 'returns error in old_review and improvement error' do
        result = service.compare_versions(old_content, new_content)

        expect(result[:comparison][:old_review]).to eq({ error: 'old review failure' })

        improvement = result[:improvement]
        expect(improvement).to eq({ error: 'Could not calculate improvement' })
      end
    end

    context 'when new review request fails' do
      before do
        allow(HTTParty).to receive(:post).with(
          "#{python_service_url}/review",
          body: { content: new_content, language: 'unknown' }.to_json,
          headers: { 'Content-Type' => 'application/json' }
        ).and_raise(StandardError.new('new review failure'))
      end

      it 'returns error in new_review and improvement error' do
        result = service.compare_versions(old_content, new_content)

        expect(result[:comparison][:new_review]).to eq({ error: 'new review failure' })

        improvement = result[:improvement]
        expect(improvement).to eq({ error: 'Could not calculate improvement' })
      end
    end

    context 'when reviews have missing scores and issues' do
      let(:old_review_body) do
        { 'issues' => [] }
      end

      let(:new_review_body) do
        { 'score' => 10.1234 }
      end

      it 'treats missing scores as zero and handles nil issues arrays' do
        result = service.compare_versions(old_content, new_content)

        improvement = result[:improvement]
        expect(improvement[:score_delta]).to eq(10.12)
        expect(improvement[:improvement_percentage]).to eq(0)
        expect(improvement[:issues_reduced]).to eq(0 - 0)
      end
    end
  end

  describe '#detect_language' do
    it 'returns ruby for .rb files' do
      result = service.send(:detect_language, 'foo.rb')
      expect(result).to eq('ruby')
    end

    it 'returns go for .go files' do
      result = service.send(:detect_language, 'foo.go')
      expect(result).to eq('go')
    end

    it 'returns python for .py files' do
      result = service.send(:detect_language, 'foo.py')
      expect(result).to eq('python')
    end

    it 'returns javascript for .js files' do
      result = service.send(:detect_language, 'foo.js')
      expect(result).to eq('javascript')
    end

    it 'returns typescript for .ts files' do
      result = service.send(:detect_language, 'foo.ts')
      expect(result).to eq('typescript')
    end

    it 'returns java for .java files' do
      result = service.send(:detect_language, 'foo.java')
      expect(result).to eq('java')
    end

    it 'returns unknown for unrecognized extensions' do
      result = service.send(:detect_language, 'foo.txt')
      expect(result).to eq('unknown')
    end

    it 'handles paths without extension' do
      result = service.send(:detect_language, 'README')
      expect(result).to eq('unknown')
    end

    it 'is case insensitive on extension' do
      result = service.send(:detect_language, 'Foo.RB')
      expect(result).to eq('ruby')
    end
  end
end
