require 'rails_helper'
require_relative '../../app/services/code_aggregator'
require 'spec_helper'

RSpec.describe CodeAggregator do
  let(:go_url) { 'http://go.example.com' }
  let(:python_url) { 'http://python.example.com' }
  subject(:service) { described_class.new(go_url, python_url) }

  describe '#aggregate_analysis' do
    let(:content) { "puts 'hello'" }
    let(:path) { 'lib/sample.rb' }

    context 'when both services succeed' do
      let(:go_parse_response) do
        { 'ast' => { 'nodes' => 3 }, 'valid' => true }
      end
      let(:python_review_response) do
        { 'score' => 92.5, 'issues' => [{ 'rule' => 'Style', 'message' => 'Use double quotes' }] }
      end

      before do
        allow(HTTParty).to receive(:post)
          .with("#{go_url}/parse", hash_including(:body, :headers))
          .and_return(double(body: go_parse_response.to_json))

        allow(HTTParty).to receive(:post)
          .with("#{python_url}/review", hash_including(:body, :headers))
          .and_return(double(body: python_review_response.to_json))
      end

      it 'returns aggregated analysis with detected language and parsed/reviewed data' do
        result = service.aggregate_analysis(content, path)

        expect(result).to include(:timestamp, :file_path, :language, :analysis)
        expect(result[:file_path]).to eq(path)
        expect(result[:language]).to eq('ruby')
        expect(result[:analysis][:parsing]).to eq(go_parse_response)
        expect(result[:analysis][:review]).to eq(python_review_response)
        expect(result[:timestamp]).to be_a(String)
      end
    end

    context 'when Go parse service raises an error' do
      let(:python_review_response) { { 'score' => 80.0, 'issues' => [] } }

      before do
        allow(HTTParty).to receive(:post)
          .with("#{go_url}/parse", hash_including(:body, :headers))
          .and_raise(StandardError, 'go failure')

        allow(HTTParty).to receive(:post)
          .with("#{python_url}/review", hash_including(:body, :headers))
          .and_return(double(body: python_review_response.to_json))
      end

      it 'captures the error in parsing result' do
        result = service.aggregate_analysis(content, path)
        expect(result[:analysis][:parsing]).to eq(error: 'go failure')
        expect(result[:analysis][:review]).to eq(python_review_response)
      end
    end

    context 'when Python review service raises an error' do
      let(:go_parse_response) { { 'ast' => { 'nodes' => 1 } } }

      before do
        allow(HTTParty).to receive(:post)
          .with("#{go_url}/parse", hash_including(:body, :headers))
          .and_return(double(body: go_parse_response.to_json))

        allow(HTTParty).to receive(:post)
          .with("#{python_url}/review", hash_including(:body, :headers))
          .and_raise(StandardError, 'python failure')
      end

      it 'captures the error in review result' do
        result = service.aggregate_analysis(content, path)
        expect(result[:analysis][:parsing]).to eq(go_parse_response)
        expect(result[:analysis][:review]).to eq(error: 'python failure')
      end
    end

    context 'when services return invalid JSON' do
      before do
        allow(HTTParty).to receive(:post)
          .with("#{go_url}/parse", hash_including(:body, :headers))
          .and_return(double(body: 'not-json'))

        allow(HTTParty).to receive(:post)
          .with("#{python_url}/review", hash_including(:body, :headers))
          .and_return(double(body: 'also-not-json'))
      end

      it 'rescues JSON parse errors and returns error hashes' do
        result = service.aggregate_analysis(content, path)
        expect(result[:analysis][:parsing]).to include(:error)
        expect(result[:analysis][:review]).to include(:error)
      end
    end

    context 'with unknown language extension' do
      let(:unknown_path) { 'data/file.unknown' }
      let(:go_parse_response) { { 'ok' => true } }
      let(:python_review_response) { { 'score' => 0, 'issues' => [] } }

      before do
        allow(HTTParty).to receive(:post)
          .with("#{go_url}/parse", hash_including(:body, :headers))
          .and_return(double(body: go_parse_response.to_json))

        allow(HTTParty).to receive(:post)
          .with("#{python_url}/review", hash_including(:body, :headers))
          .and_return(double(body: python_review_response.to_json))
      end

      it 'sets language to unknown' do
        result = service.aggregate_analysis(content, unknown_path)
        expect(result[:language]).to eq('unknown')
      end
    end
  end

  describe '#compare_versions' do
    let(:old_content) { "puts 'old'" }
    let(:new_content) { "puts 'new'" }

    context 'when all services succeed' do
      let(:diff_response) { { 'added' => 2, 'removed' => 1 } }
      let(:old_review) { { 'score' => 50.0, 'issues' => [{ 'id' => 1 }, { 'id' => 2 }] } }
      let(:new_review) { { 'score' => 75.0, 'issues' => [{ 'id' => 1 }] } }

      before do
        allow(HTTParty).to receive(:post)
          .with("#{go_url}/diff", hash_including(:body, :headers))
          .and_return(double(body: diff_response.to_json))

        allow(HTTParty).to receive(:post)
          .with("#{python_url}/review", hash_including(:body, :headers))
          .and_return(
            double(body: old_review.to_json),  # comparison old_review
            double(body: new_review.to_json),  # comparison new_review
            double(body: old_review.to_json),  # improvement old_review
            double(body: new_review.to_json)   # improvement new_review
          )
      end

      it 'returns comparison data and calculated improvement' do
        result = service.compare_versions(old_content, new_content)

        expect(result).to include(:timestamp, :comparison, :improvement)
        expect(result[:comparison][:diff]).to eq(diff_response)
        expect(result[:comparison][:old_review]).to eq(old_review)
        expect(result[:comparison][:new_review]).to eq(new_review)

        expect(result[:improvement]).to eq(
          score_delta: 25.0,
          improvement_percentage: 50.0,
          issues_reduced: 1
        )
      end
    end

    context 'when diff service raises an error' do
      let(:old_review) { { 'score' => 10.0, 'issues' => [] } }
      let(:new_review) { { 'score' => 20.0, 'issues' => [] } }

      before do
        allow(HTTParty).to receive(:post)
          .with("#{go_url}/diff", hash_including(:body, :headers))
          .and_raise(StandardError, 'diff failed')

        allow(HTTParty).to receive(:post)
          .with("#{python_url}/review", hash_including(:body, :headers))
          .and_return(
            double(body: old_review.to_json),
            double(body: new_review.to_json),
            double(body: old_review.to_json),
            double(body: new_review.to_json)
          )
      end

      it 'captures the error in diff result and still computes improvement' do
        result = service.compare_versions(old_content, new_content)

        expect(result[:comparison][:diff]).to eq(error: 'diff failed')
        expect(result[:improvement]).to eq(
          score_delta: 10.0,
          improvement_percentage: 100.0,
          issues_reduced: 0
        )
      end
    end

    context 'when improvement cannot be calculated due to review errors' do
      let(:good_old) { { 'score' => 40.0, 'issues' => [{ 'id' => 1 }] } }
      let(:good_new) { { 'score' => 60.0, 'issues' => [] } }
      let(:error_hash) { { 'error' => 'Service down' } }
      let(:diff_response) { { 'changed' => true } }

      before do
        allow(HTTParty).to receive(:post)
          .with("#{go_url}/diff", hash_including(:body, :headers))
          .and_return(double(body: diff_response.to_json))

        # Stub private review_with_python to control the sequence:
        # 1) comparison old, 2) comparison new, 3) improvement old (error), 4) improvement new
        allow(service).to receive(:review_with_python).and_return(good_old, good_new, error_hash, good_new)
      end

      it 'returns an error structure for improvement and does not raise' do
        expect do
          result = service.compare_versions(old_content, new_content)
          expect(result[:comparison][:old_review]).to eq(good_old)
          expect(result[:comparison][:new_review]).to eq(good_new)
          expect(result[:improvement]).to eq(error: 'Could not calculate improvement')
        end.not_to raise_error
      end
    end
  end
end
