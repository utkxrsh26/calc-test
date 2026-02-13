import pytest
from unittest.mock import patch, MagicMock

from src.code_reviewer import CodeReviewer, CodeIssue, ReviewResult


@pytest.fixture
def reviewer():
    """Create a CodeReviewer instance for testing."""
    return CodeReviewer()


@pytest.fixture
def long_line():
    """Provide a line exceeding 120 characters."""
    return "a" * 121


def test_codeissue_initialization_defaults():
    """Test CodeIssue dataclass initialization and default suggestion."""
    issue = CodeIssue(severity="warning", line=10, message="Test message")
    assert issue.severity == "warning"
    assert issue.line == 10
    assert issue.message == "Test message"
    assert issue.suggestion is None


def test_reviewresult_initialization():
    """Test ReviewResult dataclass initialization."""
    result = ReviewResult(score=95.5, issues=[], suggestions=["Tip"], complexity_score=0.2)
    assert result.score == pytest.approx(95.5)
    assert result.issues == []
    assert result.suggestions == ["Tip"]
    assert result.complexity_score == pytest.approx(0.2)


def test_codereviewer_init_patterns_default(reviewer):
    """Test that CodeReviewer initializes with expected patterns."""
    assert len(reviewer.complexity_patterns) == 7
    assert any(r"\bif\s+" in p for p in reviewer.complexity_patterns)
    assert any(r"\bfor\s+" in p for p in reviewer.complexity_patterns)
    assert any(r"\bwhile\s+" in p for p in reviewer.complexity_patterns)
    assert any(r"\btry\s*:" in p for p in reviewer.complexity_patterns)
    assert any(r"\bexcept\s+" in p for p in reviewer.complexity_patterns)
    assert any(r"\bswitch\s+" in p for p in reviewer.complexity_patterns)
    assert any(r"\bcase\s+" in p for p in reviewer.complexity_patterns)

    assert len(reviewer.smell_patterns) == 4
    messages = [tpl[1] for tpl in reviewer.smell_patterns]
    assert "Empty function detected" in messages
    assert "Debug print statement found" in messages
    assert "TODO/FIXME comment found" in messages
    assert "Ellipsis placeholder found" in messages


def test_codereviewer_analyze_line_line_length_warning(reviewer, long_line):
    """Test that a line exceeding 120 characters triggers a warning."""
    issues = reviewer._analyze_line(long_line, line_num=3, language="python")
    assert any(i.message == "Line exceeds 120 characters" and i.severity == "warning" and i.line == 3 for i in issues)


def test_codereviewer_analyze_line_unnecessary_semicolon_python(reviewer):
    """Test that a trailing semicolon in Python triggers an info issue."""
    issues = reviewer._analyze_line("x = 1;", line_num=1, language="python")
    assert any(i.message == "Unnecessary semicolon in Python" and i.severity == "info" for i in issues)


def test_codereviewer_analyze_line_no_semicolon_warning_non_python(reviewer):
    """Test that a trailing semicolon in non-Python does not trigger an issue."""
    issues = reviewer._analyze_line("x = 1;", line_num=1, language="javascript")
    assert all(i.message != "Unnecessary semicolon in Python" for i in issues)


def test_codereviewer_analyze_line_detect_empty_function_smell(reviewer):
    """Test detection of empty function smell."""
    issues = reviewer._analyze_line("def foo(a, b): pass", line_num=1, language="python")
    assert any(i.message == "Empty function detected" and i.severity == "warning" for i in issues)


def test_codereviewer_analyze_line_detect_debug_print_smell(reviewer):
    """Test detection of debug print statement smell."""
    issues = reviewer._analyze_line("print('debug')", line_num=2, language="python")
    assert any(i.message == "Debug print statement found" and i.severity == "warning" for i in issues)


def test_codereviewer_analyze_line_detect_todo_ignorecase(reviewer):
    """Test detection of TODO/FIXME/HACK/XXX comments case-insensitively."""
    issues = reviewer._analyze_line("# todo: something", line_num=5, language="python")
    assert any(i.message == "TODO/FIXME comment found" and i.severity == "warning" and i.line == 5 for i in issues)


def test_codereviewer_analyze_line_detect_ellipsis_placeholder(reviewer):
    """Test detection of ellipsis placeholder smell."""
    issues = reviewer._analyze_line("...", line_num=4, language="python")
    assert any(i.message == "Ellipsis placeholder found" and i.severity == "warning" for i in issues)


def test_codereviewer_analyze_line_detect_hardcoded_password_case_insensitive(reviewer):
    """Test detection of potential hardcoded password case-insensitively."""
    issues = reviewer._analyze_line("PASSWORD = 'secret'", line_num=6, language="python")
    assert any(i.message == "Potential hardcoded password" and i.severity == "error" and i.line == 6 for i in issues)


def test_codereviewer_count_complexity_all_patterns(reviewer):
    """Test that complexity count includes all defined patterns."""
    line = "if x: for i in y: while True: try: pass except ValueError: switch v: case 1: pass"
    count = reviewer._count_complexity(line)
    assert count == 7


def test_codereviewer_calculate_complexity_score_variants(reviewer):
    """Test complexity score calculation including edge cases and clamping."""
    assert reviewer._calculate_complexity_score(0, 0) == pytest.approx(0.0)
    assert reviewer._calculate_complexity_score(3, 10) == pytest.approx(0.3)
    assert reviewer._calculate_complexity_score(20, 10) == pytest.approx(1.0)


def test_codereviewer_calculate_score_penalty_and_bounds(reviewer):
    """Test score calculation with mixed severities and clamping to [0, 100]."""
    issues = [
        CodeIssue(severity="error", line=1, message="e1"),
        CodeIssue(severity="error", line=2, message="e2"),
        CodeIssue(severity="warning", line=3, message="w1"),
        CodeIssue(severity="warning", line=4, message="w2"),
        CodeIssue(severity="warning", line=5, message="w3"),
        CodeIssue(severity="info", line=6, message="i1"),
        CodeIssue(severity="info", line=7, message="i2"),
        CodeIssue(severity="info", line=8, message="i3"),
        CodeIssue(severity="info", line=9, message="i4"),
        CodeIssue(severity="info", line=10, message="i5"),
    ]
    score = reviewer._calculate_score(issues, complexity_score=0.5)
    # Penalties: errors=20, warnings=15, infos=5, complexity=10 => total=50, score=50
    assert score == pytest.approx(50.0)

    many_errors = [CodeIssue(severity="error", line=i, message="e") for i in range(1, 30)]
    score2 = reviewer._calculate_score(many_errors, complexity_score=1.0)
    assert score2 == pytest.approx(0.0)


def test_codereviewer_review_code_end_to_end_scores_and_suggestions(reviewer):
    """Test end-to-end review_code behavior with issues and complexity suggestion."""
    content = "\n".join(
        [
            "def foo(a, b): pass",  # empty function smell
            "print('hello');",      # debug print smell + semicolon info
            "# TODO: fix",          # todo smell
            "PASSWORD = 'abc'",     # hardcoded password error
            "if x: for i in range(3): while False: try: pass",  # 4 complexity hits
            "except Exception:",    # 1 complexity hit (except)
            "switch x: case 1:",    # 2 complexity hits (switch, case)
        ]
    )
    result = reviewer.review_code(content, language="python")

    assert isinstance(result, ReviewResult)
    assert result.complexity_score == pytest.approx(1.0)
    # Issues: empty func (1), debug print (1), semicolon info (1), TODO (1), hardcoded password (1) => total 5
    assert len(result.issues) == 5
    assert "Consider refactoring to reduce cyclomatic complexity" in result.suggestions

    # Score calculation: base 100 - error(10) - warnings(3*5=15) - info(1) - complexity(20) = 54
    assert result.score == pytest.approx(54.0)


def test_codereviewer_review_code_many_issues_adds_suggestion(reviewer):
    """Test that a high number of issues triggers the high-issues suggestion."""
    content = "\n".join(["x" * 121 for _ in range(11)])  # 11 long lines => 11 warnings
    result = reviewer.review_code(content)
    assert "High number of issues detected. Consider code review" in result.suggestions
    assert result.complexity_score == pytest.approx(0.0)
    # Score: 100 - warnings(11*5=55) = 45
    assert result.score == pytest.approx(45.0)


def test_codereviewer_review_code_empty_content(reviewer):
    """Test review_code with empty content produces no issues and perfect score."""
    result = reviewer.review_code("")
    assert result.issues == []
    assert result.suggestions == []
    assert result.complexity_score == pytest.approx(0.0)
    assert result.score == pytest.approx(100.0)


def test_codereviewer_review_function_param_limit_warning(reviewer):
    """Test review_function warns when function has more than 5 parameters."""
    func_code = "def f(a, b, c, d, e, f, g):\n    pass\n"
    result = reviewer.review_function(func_code)
    assert result["warning"] == "Function has too many parameters"
    assert "configuration object or data class" in result["suggestion"]


def test_codereviewer_review_function_length_warning(reviewer):
    """Test review_function warns when function source has more than 50 lines."""
    func_code = "def f(a, b):\n" + "\n".join("    pass" for _ in range(51))
    result = reviewer.review_function(func_code)
    assert result["warning"] == "Function is too long"
    assert "breaking into smaller functions" in result["suggestion"]


def test_codereviewer_review_function_ok(reviewer):
    """Test review_function returns ok for acceptable parameter count and length."""
    func_code = "def f(a, b, c, d, e):\n" + "\n".join("    pass" for _ in range(10))
    result = reviewer.review_function(func_code)
    assert result == {"status": "ok"}


def test_codereviewer_review_code_calls_helpers_with_mocks(reviewer):
    """Test that review_code calls helper methods and aggregates results correctly using mocks."""
    content = "line1\nline2\nline3"

    mock_issue = CodeIssue(severity="warning", line=1, message="mock")
    with patch.object(reviewer, "_analyze_line", return_value=[mock_issue]) as mock_analyze, \
         patch.object(reviewer, "_count_complexity", return_value=0) as mock_count, \
         patch.object(reviewer, "_calculate_complexity_score", return_value=0.8) as mock_cx, \
         patch.object(reviewer, "_calculate_score", return_value=42.0) as mock_score:

        result = reviewer.review_code(content)

        # Verify calls
        assert mock_analyze.call_count == 3
        assert mock_count.call_count == 3
        mock_cx.assert_called_once()
        mock_score.assert_called_once()

        # Verify aggregation of results and suggestions with mocked complexity score
        assert result.score == pytest.approx(42.0)
        assert result.complexity_score == pytest.approx(0.8)
        assert len(result.issues) == 3
        assert "Consider refactoring to reduce cyclomatic complexity" in result.suggestions
        assert all(issue.message == "mock" for issue in result.issues)


def test_codereviewer_review_code_complexity_threshold_not_inclusive(reviewer):
    """Test that complexity suggestion is not added when complexity_score == 0.7."""
    content = "line1\nline2\nline3"
    with patch.object(reviewer, "_analyze_line", return_value=[]), \
         patch.object(reviewer, "_count_complexity", return_value=0), \
         patch.object(reviewer, "_calculate_complexity_score", return_value=0.7), \
         patch.object(reviewer, "_calculate_score", return_value=100.0):
        result = reviewer.review_code(content)
        assert "Consider refactoring to reduce cyclomatic complexity" not in result.suggestions
        assert result.complexity_score == pytest.approx(0.7)
        assert result.score == pytest.approx(100.0)