package parser

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestParseFile_SizeAndTrailingNewline(t *testing.T) {
	p := NewParser()

	content := "line1\nline2\n"
	file, err := p.ParseFile(content, "FILE.TS")
	assert.NoError(t, err)

	assert.Equal(t, len(content), file.Size)
	assert.Equal(t, 3, len(file.Lines))
	assert.Equal(t, "", file.Lines[len(file.Lines)-1])
	assert.Equal(t, "typescript", file.Language)
}

func TestAnalyzeDiff_Cases(t *testing.T) {
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
			name:       "whitespace ignored",
			oldContent: "line",
			newContent: "   line   ",
			added:      []int{},
			removed:    []int{},
			modified:   []int{},
		},
		{
			name:       "single modified line",
			oldContent: "a\nb",
			newContent: "a\nc",
			added:      []int{},
			removed:    []int{},
			modified:   []int{1},
		},
		{
			name:       "added line at end",
			oldContent: "a",
			newContent: "a\nb",
			added:      []int{1},
			removed:    []int{},
			modified:   []int{},
		},
		{
			name:       "removed line at end",
			oldContent: "a\nb",
			newContent: "a",
			added:      []int{},
			removed:    []int{1},
			modified:   []int{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			diff, err := p.AnalyzeDiff(tt.oldContent, tt.newContent)
			assert.NoError(t, err)
			assert.ElementsMatch(t, tt.added, diff.AddedLines)
			assert.ElementsMatch(t, tt.removed, diff.RemovedLines)
			assert.ElementsMatch(t, tt.modified, diff.ModifiedLines)
		})
	}
}

func TestCalculateMetrics_MultiLineCommentsAndCounts(t *testing.T) {
	p := NewParser()

	content := "/* one-line block */\n" +
		"code line\n" +
		"/* start\n" +
		"middle\n" +
		"end */\n" +
		"# line comment\n" +
		"-- sql comment\n" +
		"\n" +
		"def f():\n" +
		"    if x:\n" +
		"        while y:\n" +
		"            pass\n" +
		"\n" +
		"type MyType struct{}\n"

	m := p.CalculateMetrics(content)

	assert.Equal(t, 14, m.TotalLines)
	assert.Equal(t, 6, m.CommentLines) // one-line block + 3-line block + # + --
	assert.Equal(t, 2, m.BlankLines)
	assert.Equal(t, 6, m.CodeLines)  // code line, def, if, while, pass, type
	assert.Equal(t, 1, m.Functions)  // def
	assert.Equal(t, 1, m.Classes)    // type
	assert.Equal(t, 2, m.Complexity) // if + while
}

func TestDetectLanguage_CaseInsensitiveAndAdditionalExts(t *testing.T) {
	tests := []struct {
		path     string
		expected string
	}{
		{"FILE.TS", "typescript"},
		{"main.CPP", "cpp"},
		{"lib.RS", "rust"},
	}

	for _, tt := range tests {
		t.Run(tt.path, func(t *testing.T) {
			got := detectLanguage(tt.path)
			assert.Equal(t, tt.expected, got)
		})
	}
}
