package parser

import (
	"testing"

	"github.com/stretchr/testify/assert"
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

func TestAnalyzeDiff_AddedRemovedModifiedExact(t *testing.T) {
	p := NewParser()

	oldContent := "line1\n\nline3"
	newContent := "line1\nline2\n"

	diff, err := p.AnalyzeDiff(oldContent, newContent)
	assert.NoError(t, err)

	assert.Equal(t, []int{1}, diff.AddedLines)
	assert.Equal(t, []int{2}, diff.RemovedLines)
	assert.Empty(t, diff.ModifiedLines)
}

func TestAnalyzeDiff_IgnoresWhitespaceOnlyChanges(t *testing.T) {
	p := NewParser()

	oldContent := "a\nb\nc"
	newContent := "a\n b\nc"

	diff, err := p.AnalyzeDiff(oldContent, newContent)
	assert.NoError(t, err)

	assert.Empty(t, diff.AddedLines)
	assert.Empty(t, diff.RemovedLines)
	assert.Empty(t, diff.ModifiedLines)
}

func TestCalculateMetrics_MultiLineComments(t *testing.T) {
	p := NewParser()

	content := "/*\nblock comment\n*/\ncode"
	m := p.CalculateMetrics(content)

	assert.Equal(t, 4, m.TotalLines)
	assert.Equal(t, 3, m.CommentLines)
	assert.Equal(t, 1, m.CodeLines)
	assert.Equal(t, 0, m.BlankLines)
	assert.Equal(t, 0, m.Functions)
	assert.Equal(t, 0, m.Classes)
	assert.Equal(t, 0, m.Complexity)
}

func TestCalculateMetrics_ComplexityAndEntities(t *testing.T) {
	p := NewParser()

	content := `// comment with if
type MyType struct{}
func main() {
	if cond {}
	for i := 0; i < 10; i++ {}
}`
	m := p.CalculateMetrics(content)

	assert.Equal(t, 6, m.TotalLines)
	assert.Equal(t, 1, m.CommentLines)
	assert.Equal(t, 5, m.CodeLines)
	assert.Equal(t, 0, m.BlankLines)
	assert.Equal(t, 1, m.Functions)
	assert.Equal(t, 1, m.Classes)
	assert.Equal(t, 2, m.Complexity)
}

func TestCalculateMetrics_AlternateCommentMarkers(t *testing.T) {
	p := NewParser()

	content := "# shell comment\n-- sql comment\ncode"
	m := p.CalculateMetrics(content)

	assert.Equal(t, 3, m.TotalLines)
	assert.Equal(t, 2, m.CommentLines)
	assert.Equal(t, 1, m.CodeLines)
	assert.Equal(t, 0, m.BlankLines)
}

func TestParseFile_SizeAndLanguageCaseInsensitive(t *testing.T) {
	p := NewParser()

	content := "print('hi')\n"
	file, err := p.ParseFile(content, "SCRIPT.PY")
	assert.NoError(t, err)
	assert.Equal(t, "python", file.Language)
	assert.Equal(t, len(content), file.Size)
}
