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

func TestParseFile_SizeAndLinesCounts(t *testing.T) {
	p := NewParser()

	content := "line1\nline2\nline3\n" // trailing newline produces an empty last split element
	file, err := p.ParseFile(content, "SAMPLE.RS")
	assert.NoError(t, err)

	// Language should be case-insensitive by extension
	assert.Equal(t, "rust", file.Language)

	// Size should equal raw content length
	assert.Equal(t, len(content), file.Size)

	// Lines should match strings.Split behavior (trailing empty element)
	assert.Equal(t, []string{"line1", "line2", "line3", ""}, file.Lines)
}

func TestAnalyzeDiff_RemovedAndWhitespaceHandling(t *testing.T) {
	p := NewParser()

	oldContent := `same
 bbb 
to_remove
keep`
	newContent := `same
bbb

keep_mod
new_line`

	diff, err := p.AnalyzeDiff(oldContent, newContent)
	assert.NoError(t, err)

	// Whitespace-only change should not be considered modified
	assert.Equal(t, []int{3}, diff.ModifiedLines) // "keep" -> "keep_mod" at index 3
	assert.Equal(t, []int{2}, diff.RemovedLines)  // "to_remove" -> "" at index 2
	assert.Equal(t, []int{4}, diff.AddedLines)    // extra new line beyond old content
}

func TestCalculateMetrics_MultiLineCommentsAndComplexity(t *testing.T) {
	p := NewParser()

	content := `
 // one-line comment
# another comment
-- sql style
/* start block
still in block
end block */
func foo() {
}
if x > 0 {
}
for i := 0; i < 10; i++ {
}
class Something {
}
type MyType struct{}
def bar():
function baz() {
}
while (true) {
}
`

	metrics := p.CalculateMetrics(content)

	assert.Equal(t, 18, metrics.TotalLines)
	assert.Equal(t, 2, metrics.BlankLines)
	assert.Equal(t, 6, metrics.CommentLines)
	assert.Equal(t, 10, metrics.CodeLines)
	assert.Equal(t, 3, metrics.Functions)  // func, def, function
	assert.Equal(t, 2, metrics.Classes)    // class, type
	assert.Equal(t, 3, metrics.Complexity) // if, for, while
}
