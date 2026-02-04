import pytest
from unittest.mock import patch, MagicMock
from src.code_reviewer import CodeIssue, ReviewResult, CodeReviewer


@pytest.fixture
def reviewer():
    """Provide a fresh CodeReviewer instance for each test."""
    return CodeReviewer()


def test_codeissue_initialization_basic():
    """Test CodeIssue dataclass initialization and field assignment."""
    issue = CodeIssue(severity="warning", line=10, message="Test message", suggestion="Fix it")
    assert issue.severity == "warning"
    assert issue.line == 10
    assert issue.message == "Test message"
    assert issue.suggestion == "Fix it"


def test_reviewresult_dataclass_direct_initialization():
    """Test ReviewResult dataclass initialization and fields."""
    issues = [CodeIssue(severity="error", line=1, message="err")]
    suggestions = ["Do X", "Do Y"]
    result = ReviewResult(score=75.5, issues=issues, suggestions=suggestions, complexity_score=0.25)
    assert result.score == pytest.approx(75.5)
    assert result.issues == issues
    assert result.suggestions == suggestions
    assert result.complexity_score == pytest.approx(0.25)


def test_codereviewer_init_default_patterns(reviewer):
    """Test that CodeReviewer initializes with expected patterns."""
    assert any(r"\bif\s+" == p for p in reviewer.complexity_patterns)
    assert any(r"\bfor\s+" == p for p in reviewer.complexity_patterns)
    assert any(r"\bwhile\s+" == p for p in reviewer.complexity_patterns)
    assert any(r"\btry\s*:" == p for p in reviewer.complexity_patterns)
    assert any(r"\bexcept\s+" == p for p in reviewer.complexity_patterns)
    assert any(r"\bswitch\s+" == p for p in reviewer.complexity_patterns)
    assert any(r"\bcase\s+" == p for p in reviewer.complexity_patterns)

    smell_patterns = [sp[0] for sp in reviewer.smell_patterns]
    assert r"def\s+\w+\([^)]*\):\s*pass" in smell_patterns
    assert r"print\s*\(" in smell_patterns
    assert r"todo|fixme|hack|xxx" in smell_patterns
    assert r"\.\.\." in smell_patterns


def test_codereviewer_analyze_line_long_line_warning(reviewer):
    """Test that long lines produce a warning with suggestion."""
    long_line = "a" * 121
    issues = reviewer._analyze_line(long_line, 5, "python")
    assert any(i.message == "Line exceeds 120 characters" and i.severity == "warning" for i in issues)
    assert any(i.suggestion == "Consider breaking into multiple lines" for i in issues)


def test_codereviewer_analyze_line_semicolon_info_for_python(reviewer):
    """Test that a trailing semicolon in Python produces an info issue."""
    issues = reviewer._analyze_line("x = 1;", 3, "python")
    assert any(i.message == "Unnecessary semicolon in Python" and i.severity == "info" for i in issues)
    assert any(i.suggestion == "Remove semicolon" for i in issues)


def test_codereviewer_analyze_line_semicolon_ignored_for_non_python(reviewer):
    """Test that a trailing semicolon in non-Python language does not produce an info issue."""
    issues = reviewer._analyze_line("x = 1;", 3, "javascript")
    assert not any(i.message == "Unnecessary semicolon in Python" for i in issues)


def test_codereviewer_analyze_line_smells_detected(reviewer):
    """Test detection of smell patterns: empty function, print, TODO, ellipsis."""
    # Empty function
    issues_empty = reviewer._analyze_line("def foo(): pass", 1, "python")
    assert any(i.message == "Empty function detected" and i.severity == "warning" for i in issues_empty)

    # Debug print
    issues_print = reviewer._analyze_line("print('debug')", 2, "python")
    assert any(i.message == "Debug print statement found" and i.severity == "warning" for i in issues_print)

    # TODO / FIXME / HACK / XXX (case-insensitive)
    issues_todo = reviewer._analyze_line("# ToDo: fix this", 3, "python")
    assert any(i.message == "TODO/FIXME comment found" and i.severity == "warning" for i in issues_todo)

    issues_xxx = reviewer._analyze_line("# XXX: revisit", 4, "python")
    assert any(i.message == "TODO/FIXME comment found" and i.severity == "warning" for i in issues_xxx)

    # Ellipsis
    issues_ellipsis = reviewer._analyze_line("...", 5, "python")
    assert any(i.message == "Ellipsis placeholder found" and i.severity == "warning" for i in issues_ellipsis)


def test_codereviewer_analyze_line_hardcoded_password_error(reviewer):
    """Test detection of a potential hardcoded password."""
    issues = reviewer._analyze_line("password = 'secret'", 10, "python")
    assert any(i.message == "Potential hardcoded password" and i.severity == "error" for i in issues)
    assert any(i.suggestion == "Use environment variables or secure storage" for i in issues)


def test_codereviewer_count_complexity_multiple_patterns(reviewer):
    """Test complexity counting with multiple distinct patterns on a line."""
    line = "if x: pass  for i in range(3): pass  try: pass  except Exception: pass"
    count = reviewer._count_complexity(line)
    # Patterns present: if, for, try:, except
    assert count == 4


def test_codereviewer_count_complexity_duplicate_keywords_count_once(reviewer):
    """Test that multiple occurrences of same pattern on a line count once per pattern."""
    line = "if a: pass; if b: pass; if c: pass"
    # Only 'if' should be counted once
    count = reviewer._count_complexity(line)
    assert count == 1


def test_codereviewer_calculate_complexity_score_zero_lines(reviewer):
    """Test complexity score returns 0.0 when total_lines is 0."""
    score = reviewer._calculate_complexity_score(5, 0)
    assert score == pytest.approx(0.0)


def test_codereviewer_calculate_complexity_score_capped_at_one(reviewer):
    """Test complexity score is normalized and capped at 1.0."""
    score = reviewer._calculate_complexity_score(100, 10)
    assert score == pytest.approx(1.0)


def test_codereviewer_calculate_score_penalties_and_complexity(reviewer):
    """Test calculate_score applies correct penalties and complexity contribution."""
    issues = []
    issues.append(CodeIssue(severity="error", line=1, message="E1"))
    issues.extend([CodeIssue(severity="warning", line=2, message="W") for _ in range(2)])
    issues.extend([CodeIssue(severity="info", line=3, message="I") for _ in range(3)])
    complexity_score = 0.5  # penalty = 10

    score = reviewer._calculate_score(issues, complexity_score)
    # base 100 - (1*10) - (2*5) - (3*1) - (0.5*20=10) = 67
    assert score == pytest.approx(67.0)


def test_codereviewer_calculate_score_clamped_bounds(reviewer):
    """Test calculate_score clamps results between 0 and 100."""
    # Upper bound
    score_high = reviewer._calculate_score([], 0.0)
    assert score_high == pytest.approx(100.0)

    # Lower bound: many errors to push below zero
    many_errors = [CodeIssue(severity="error", line=i, message="E") for i in range(20)]
    score_low = reviewer._calculate_score(many_errors, 1.0)  # extra penalty
    assert score_low == pytest.approx(0.0)


def test_codereviewer_review_function_ok(reviewer):
    """Test review_function returns ok for small parameter count and short length."""
    fn = "def f(a, b):\n    return a + b\n"
    result = reviewer.review_function(fn)
    assert result == {"status": "ok"}


def test_codereviewer_review_function_too_many_params(reviewer):
    """Test review_function warns when parameter count exceeds 5."""
    fn = "def f(a, b, c, d, e, f):\n    return a\n"
    result = reviewer.review_function(fn)
    assert result["warning"] == "Function has too many parameters"
    assert result["suggestion"] == "Consider using a configuration object or data class"


def test_codereviewer_review_function_too_long(reviewer):
    """Test review_function warns when function has more than 50 lines."""
    body_lines = "\n".join("    x = 1" for _ in range(51))  # 51 body lines + def line = 52
    fn = f"def f():\n{body_lines}\n"
    result = reviewer.review_function(fn)
    assert result["warning"] == "Function is too long"
    assert result["suggestion"] == "Consider breaking into smaller functions"


def test_codereviewer_review_function_no_parentheses_handled(reviewer):
    """Test review_function handles function-like strings without parentheses gracefully."""
    fn = "def f:\n    pass\n"
    result = reviewer.review_function(fn)
    assert result == {"status": "ok"}


def test_codereviewer_review_code_empty_content(reviewer):
    """Test review_code handles empty content producing perfect score and no suggestions."""
    result = reviewer.review_code("")
    assert isinstance(result, ReviewResult)
    assert result.score == pytest.approx(100.0)
    assert result.complexity_score == pytest.approx(0.0)
    assert result.issues == []
    assert result.suggestions == []


def test_codereviewer_review_code_actual_detection(reviewer):
    """Test review_code detects various issues from content."""
    content = "\n".join(
        [
            "print('debug')",  # debug print
            "# TODO: something",  # TODO
            "...",  # ellipsis
            "password = 's3cr3t'",  # hardcoded password
            "x = 1;",  # unnecessary semicolon in Python
            "def empty(): pass",  # empty function
            "if cond: pass",  # complexity
        ]
    )
    result = reviewer.review_code(content, language="python")
    messages = [i.message for i in result.issues]
    assert "Debug print statement found" in messages
    assert "TODO/FIXME comment found" in messages
    assert "Ellipsis placeholder found" in messages
    assert "Potential hardcoded password" in messages
    assert "Unnecessary semicolon in Python" in messages
    assert "Empty function detected" in messages
    assert result.complexity_score > 0.0


def test_codereviewer_review_code_end_to_end_with_mocks_suggestions_and_score(reviewer):
    """Test review_code integrates line analysis, complexity, and suggestions using mocks."""
    # Prepare mocked issues: 11 warnings to trigger "High number of issues" suggestion
    mocked_issues = [CodeIssue(severity="warning", line=1, message=f"W{i}") for i in range(11)]

    with patch("src.code_reviewer.CodeReviewer._analyze_line", return_value=mocked_issues) as mock_analyze, \
         patch("src.code_reviewer.CodeReviewer._count_complexity", return_value=1) as mock_complexity:
        content = "only one line"
        result = reviewer.review_code(content, language="python")

    # Verify mocked methods were called once (since one line in content)
    mock_analyze.assert_called_once()
    mock_complexity.assert_called_once()

    # Suggestions: complexity_score = 1/1 = 1.0 -> refactor suggestion, and >10 issues -> code review suggestion
    assert "Consider refactoring to reduce cyclomatic complexity" in result.suggestions
    assert "High number of issues detected. Consider code review" in result.suggestions

    # Score: 11 warnings -> 55 penalty; complexity 1.0 -> 20 penalty; total 25
    assert result.score == pytest.approx(25.0)
    assert result.complexity_score == pytest.approx(1.0)