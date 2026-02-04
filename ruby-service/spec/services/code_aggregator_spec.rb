require 'spec_helper'
require_relative '../../app/services/code_aggregator'
require 'json'
require 'time'

RSpec.describe CodeAggregator do
  let(:go_url) { 'http://go.example.com' }
  let(:python_url) { 'http://py.example.com' }
  let(:service) { described_class.new(go_url, python_url) }
  let(:fixed_time) { Time.new(2023, 1, 1, 12, 0, 0, '+00:00') }

  before do
    allow(Time).to receive(:now).and_return(fixed_time)
  end

  describe '#aggregate_analysis' do
    let(:content) { 'puts :hello' }
    let(:path) { 'lib/hello.rb' }

    context 'when both services succeed' do
      it 'returns aggregated analysis with parsed and reviewed data and metadata' do
        go_response = double('response', body: { ast: { nodes: 3 } }.to_json)
        py_response = double('response', body: { score: 80, issues: ['x', 'y'] }.to_json)

        expect(HTTParty).to receive(:post).with(
          "#{go_url}/parse",
          body: { content: content, path: path }.to_json,
          headers: { 'Content-Type' => 'application/json' }
        ).and_return(go_response)

        expect(HTTParty).to receive(:post).with(
          "#{python_url}/review",
          body: satisfy do |b|
            json = JSON.parse(b)
            json['content'] == content && json['language'] == 'ruby'
          end,
          headers: { 'Content-Type' => 'application/json' }
        ).and_return(py_response)

        result = service.aggregate_analysis(content, path)

        expect(result[:timestamp]).to eq fixed_time.iso8601
        expect(result[:file_path]).to eq path
        expect(result[:language]).to eq 'ruby'
        expect(result[:analysis][:parsing]).to eq('ast' => { 'nodes' => 3 })
        expect(result[:analysis][:review]).to eq('score' => 80, 'issues' => ['x', 'y'])
      end
    end

    context 'when Go parsing fails' do
      it 'returns error in parsing and still returns review' do
        expect(HTTParty).to receive(:post).with(
          "#{go_url}/parse",
          body: { content: content, path: path }.to_json,
          headers: { 'Content-Type' => 'application/json' }
        ).and_raise(StandardError.new('parse down'))

        py_response = double('response', body: { score: 60, issues: [] }.to_json)
        expect(HTTParty).to receive(:post).with(
          "#{python_url}/review",
          body: satisfy do |b|
            JSON.parse(b)['language'] == 'ruby'
          end,
          headers: { 'Content-Type' => 'application/json' }
        ).and_return(py_response)

        result = service.aggregate_analysis(content, path)

        expect(result[:analysis][:parsing]).to eq('error' => 'parse down')
        expect(result[:analysis][:review]).to eq('score' => 60, 'issues' => [])
      end
    end
  end

  describe '#compare_versions' do
    let(:old_content) { 'old' }
    let(:new_content) { 'new' }

    context 'when services succeed and improvement is computed' do
      it 'returns diff and reviews and improvement details' do
        allow(service).to receive(:diff_with_go).and_return('changes' => ['+a', '-b'])

        old_review = { 'score' => 50, 'issues' => ['i1', 'i2', 'i3'] }
        new_review = { 'score' => 75, 'issues' => ['i1'] }

        allow(service).to receive(:review_with_python).with(old_content, nil).and_return(old_review, old_review)
        allow(service).to receive(:review_with_python).with(new_content, nil).and_return(new_review, new_review)

        result = service.compare_versions(old_content, new_content)

        expect(result[:timestamp]).to eq fixed_time.iso8601
        expect(result[:comparison][:diff]).to eq('changes' => ['+a', '-b'])
        expect(result[:comparison][:old_review]).to eq(old_review)
        expect(result[:comparison][:new_review]).to eq(new_review)
        expect(result[:improvement]).to eq(
          score_delta: 25.0,
          improvement_percentage: 50.0,
          issues_reduced: 2
        )
      end
    end

    context 'when review returns error leading to improvement error' do
      it 'returns error in improvement' do
        allow(service).to receive(:diff_with_go).and_return('diff' => {})
        allow(service).to receive(:review_with_python).with(old_content, nil).and_return({ 'error' => 'timeout' })
        allow(service).to receive(:review_with_python).with(new_content, nil).and_return({ 'score' => 10, 'issues' => [] })

        result = service.compare_versions(old_content, new_content)

        expect(result[:improvement]).to eq(error: 'Could not calculate improvement')
      end
    end

    context 'when old score is zero' do
      it 'returns improvement_percentage as 0' do
        allow(service).to receive(:diff_with_go).and_return('diff' => {})
        allow(service).to receive(:review_with_python).with(old_content, nil).and_return({ 'score' => 0, 'issues' => ['a'] }, { 'score' => 0, 'issues' => ['a'] })
        allow(service).to receive(:review_with_python).with(new_content, nil).and_return({ 'score' => 50, 'issues' => [] }, { 'score' => 50, 'issues' => [] })

        result = service.compare_versions(old_content, new_content)

        expect(result[:improvement][:improvement_percentage]).to eq 0
        expect(result[:improvement][:score_delta]).to eq 50.0
        expect(result[:improvement][:issues_reduced]).to eq 1
      end
    end

    context 'when diff endpoint fails' do
      it 'returns error hash in diff and still computes improvement' do
        allow(HTTParty).to receive(:post).with(
          "#{go_url}/diff",
          body: { old_content: old_content, new_content: new_content }.to_json,
          headers: { 'Content-Type' => 'application/json' }
        ).and_raise(StandardError.new('diff failed'))

        py_response = double('response', body: { score: 40, issues: ['a', 'b'] }.to_json)
        allow(HTTParty).to receive(:post).with(
          "#{python_url}/review",
          anything
        ).and_return(py_response)

        result = service.compare_versions(old_content, new_content)

        expect(result[:comparison][:diff]).to eq('error' => 'diff failed')
        expect(result[:improvement]).to eq(score_delta: 0.0, improvement_percentage: 0, issues_reduced: 0)
      end
    end
  end

  describe '#detect_language' do
    it 'detects languages by extension' do
      expect(service.send(:detect_language, 'foo/main.go')).to eq 'go'
      expect(service.send(:detect_language, 'script.py')).to eq 'python'
      expect(service.send(:detect_language, 'lib/code.rb')).to eq 'ruby'
      expect(service.send(:detect_language, 'app.js')).to eq 'javascript'
      expect(service.send(:detect_language, 'types.ts')).to eq 'typescript'
      expect(service.send(:detect_language, 'Main.java')).to eq 'java'
      expect(service.send(:detect_language, 'README')).to eq 'unknown'
    end
  end

  describe 'review_with_python language behavior' do
    it 'uses unknown language when path is nil' do
      response = double('response', body: { score: 10 }.to_json)
      expect(HTTParty).to receive(:post).with(
        "#{python_url}/review",
        body: satisfy do |b|
          JSON.parse(b)['language'] == 'unknown'
        end,
        headers: { 'Content-Type' => 'application/json' }
      ).and_return(response)

      result = service.send(:review_with_python, 'code here')

      expect(result).to eq('score' => 10)
    end

    it 'returns error hash when request fails' do
      expect(HTTParty).to receive(:post).and_raise(StandardError.new('network down'))
      result = service.send(:review_with_python, 'x')
      expect(result).to eq('error' => 'network down')
    end
  end

  describe 'parse_with_go error handling' do
    it 'returns error hash when request fails' do
      expect(HTTParty).to receive(:post).and_raise(StandardError.new('go service down'))
      result = service.send(:parse_with_go, 'x', 'file.go')
      expect(result).to eq('error' => 'go service down')
    end
  end

  describe 'diff_with_go error handling' do
    it 'returns error hash when request fails' do
      expect(HTTParty).to receive(:post).and_raise(StandardError.new('go diff down'))
      result = service.send(:diff_with_go, 'a', 'b')
      expect(result).to eq('error' => 'go diff down')
    end
  end
end
