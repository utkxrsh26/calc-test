package parser

import (
	"github.com/stretchr/testify/assert"
	"strings"
	"testing"
)

func TestParseFile(t *testing.T) {
	p := NewParser()

	content := `package main

import "fmt"

func main() {
	fmt.Println("Hello, World!")
}`

	file, err := p.ParseFile(content, "test.go")
	assert.NoError(t, err)
	assert.Equal(t, "go", file.Language)
	assert.Equal(t, "test.go", file.Path)
	assert.Greater(t, len(file.Lines), 0)
}

func TestAnalyzeDiff(t *testing.T) {
	p := NewParser()

	oldContent := `line1
line2
line3`

	newContent := `line1
line2_modified
line3
line4`

	diff, err := p.AnalyzeDiff(oldContent, newContent)
	assert.NoError(t, err)
	assert.Greater(t, len(diff.ModifiedLines), 0)
	assert.Greater(t, len(diff.AddedLines), 0)
}

func TestCalculateMetrics(t *testing.T) {
	p := NewParser()

	content := `package main

// This is a comment
import "fmt"

func main() {
	if true {
		fmt.Println("Hello")
	}
}`

	metrics := p.CalculateMetrics(content)
	assert.Greater(t, metrics.TotalLines, 0)
	assert.Greater(t, metrics.CodeLines, 0)
	assert.Greater(t, metrics.CommentLines, 0)
	assert.Greater(t, metrics.Functions, 0)
}

func TestDetectLanguage(t *testing.T) {
	testCases := []struct {
		path     string
		expected string
	}{
		{"test.go", "go"},
		{"test.py", "python"},
		{"test.rb", "ruby"},
		{"test.js", "javascript"},
		{"unknown.xyz", "unknown"},
	}

	for _, tc := range testCases {
		p := NewParser()
		file, _ := p.ParseFile("content", tc.path)
		assert.Equal(t, tc.expected, file.Language)
	}
}

// Additional tests

func TestNewParser_NotNil(t *testing.T) {
	p := NewParser()
	assert.NotNil(t, p)
}

func TestParseFile_EmptyContent(t *testing.T) {
	p := NewParser()

	content := ``
	file, err := p.ParseFile(content, "empty.txt")
	assert.NoError(t, err)
	assert.Equal(t, "unknown", file.Language)
	assert.Equal(t, 1, len(file.Lines)) // strings.Split("", "\n") => []{""}
	assert.Equal(t, 0, file.Size)
}

func TestAnalyzeDiff_EdgeCases(t *testing.T) {
	p := NewParser()

	tests := []struct {
		name       string
		oldContent string
		newContent string
		added      []int
		removed    []int
		modified   []int
	}{
		{
			name:       "all removed",
			oldContent: "a\nb",
			newContent: "",
			added:      []int{},
			removed:    []int{0, 1},
			modified:   []int{},
		},
		{
			name:       "whitespace to text treated as add",
			oldContent: "   ",
			newContent: "x",
			added:      []int{0},
			removed:    []int{},
			modified:   []int{},
		},
		{
			name:       "text to whitespace treated as remove",
			oldContent: "y",
			newContent: "   ",
			added:      []int{},
			removed:    []int{0},
			modified:   []int{},
		},
		{
			name:       "modified line",
			oldContent: "abc",
			newContent: "abd",
			added:      []int{},
			removed:    []int{},
			modified:   []int{0},
		},
		{
			name:       "same content ignoring spaces",
			oldContent: "abc ",
			newContent: " abc",
			added:      []int{},
			removed:    []int{},
			modified:   []int{},
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			diff, err := p.AnalyzeDiff(tc.oldContent, tc.newContent)
			assert.NoError(t, err)
			assert.ElementsMatch(t, tc.added, diff.AddedLines)
			assert.ElementsMatch(t, tc.removed, diff.RemovedLines)
			assert.ElementsMatch(t, tc.modified, diff.ModifiedLines)
		})
	}
}

func TestCalculateMetrics_MultiLineCommentsAndCounters(t *testing.T) {
	p := NewParser()

	content := `
/* start
inside
end */
if x { }
for i := 0; i < 10; i++ { }
while loop
// single
# hash
-- sql
func test() {}
class Foo {}
type Bar struct{}
/* inline one-liner */
`

	m := p.CalculateMetrics(content)

	assert.Equal(t, 15, m.TotalLines)
	assert.Equal(t, 2, m.BlankLines)
	assert.Equal(t, 7, m.CommentLines)
	assert.Equal(t, 6, m.CodeLines)
	assert.Equal(t, 1, m.Functions)
	assert.Equal(t, 2, m.Classes)
	assert.Equal(t, 3, m.Complexity)
}

func TestDetectLanguage_CaseInsensitiveExtension(t *testing.T) {
	p := NewParser()

	file, err := p.ParseFile("content", "FILE.GO")
	assert.NoError(t, err)
	assert.Equal(t, "go", file.Language)
}
