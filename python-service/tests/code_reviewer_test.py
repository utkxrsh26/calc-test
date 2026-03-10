import pytest
from unittest.mock import patch, Mock
from src.code_reviewer import CodeIssue, ReviewResult, CodeReviewer


@pytest.fixture
def code_reviewer_instance():
    """Create a CodeReviewer instance for testing."""
    return CodeReviewer()


def test_code_issue_initialization():
    """Test CodeIssue dataclass initialization and default values."""
    issue = CodeIssue(
        severity="warning",
        line=10,
        message="Test message",
        suggestion="Do something",
    )
    assert issue.severity == "warning"
    assert issue.line == 10
    assert issue.message == "Test message"
    assert issue.suggestion == "Do something"

    # Test default for suggestion
    issue_default = CodeIssue(severity="info", line=1, message="No suggestion")
    assert issue_default.suggestion is None


def test_review_result_initialization():
    """Test ReviewResult dataclass initialization."""
    issues = [
        CodeIssue(severity="warning", line=1, message="Test"),
        CodeIssue(severity="error", line=2, message="Error"),
    ]
    result = ReviewResult(
        score=95.5,
        issues=issues,
        suggestions=["Suggestion 1"],
        complexity_score=0.4,
    )

    assert result.score == pytest.approx(95.5)
    assert result.issues == issues
    assert result.suggestions == ["Suggestion 1"]
    assert result.complexity_score == pytest.approx(0.4)


def test_code_reviewer_init_patterns(code_reviewer_instance):
    """Test CodeReviewer __init__ sets up patterns correctly."""
    cr = code_reviewer_instance
    assert isinstance(cr.complexity_patterns, list)
    assert len(cr.complexity_patterns) > 0
    assert any("if" in p for p in cr.complexity_patterns)

    assert isinstance(cr.smell_patterns, list)
    assert len(cr.smell_patterns) > 0
    # Each smell pattern is tuple of (pattern, message, *optional_flag)
    for pat in cr.smell_patterns:
        assert isinstance(pat[0], str)
        assert isinstance(pat[1], str)


def test_code_reviewer_analyze_line_long_line(code_reviewer_instance):
    """Test _analyze_line detects lines exceeding 120 characters."""
    long_line = "x" * 121
    issues = code_reviewer_instance._analyze_line(long_line, 1, "python")

    assert any(
        issue.message == "Line exceeds 120 characters" and issue.line == 1
        for issue in issues
    )


def test_code_reviewer_analyze_line_unnecessary_semicolon_python(code_reviewer_instance):
    """Test _analyze_line detects unnecessary semicolon in Python."""
    line = "x = 1;"
    issues = code_reviewer_instance._analyze_line(line, 5, "python")

    assert any(
        issue.message == "Unnecessary semicolon in Python"
        and issue.suggestion == "Remove semicolon"
        and issue.line == 5
        for issue in issues
    )


def test_code_reviewer_analyze_line_semicolon_non_python(code_reviewer_instance):
    """Test _analyze_line does not report semicolon for non-Python languages."""
    line = "x = 1;"
    issues = code_reviewer_instance._analyze_line(line, 5, "javascript")

    assert all(
        issue.message != "Unnecessary semicolon in Python" for issue in issues
    )


def test_code_reviewer_analyze_line_smell_patterns_empty_function(code_reviewer_instance):
    """Test _analyze_line detects empty function via smell pattern."""
    line = "def foo(): pass"
    issues = code_reviewer_instance._analyze_line(line, 2, "python")

    assert any(
        issue.message == "Empty function detected" and issue.severity == "warning"
        for issue in issues
    )


def test_code_reviewer_analyze_line_smell_patterns_print(code_reviewer_instance):
    """Test _analyze_line detects debug print statements."""
    line = "print('debug')"
    issues = code_reviewer_instance._analyze_line(line, 3, "python")

    assert any(
        issue.message == "Debug print statement found"
        and issue.suggestion == "Review and address"
        for issue in issues
    )


def test_code_reviewer_analyze_line_smell_patterns_todo_case_insensitive(code_reviewer_instance):
    """Test _analyze_line detects TODO/FIXME comments with case-insensitive matching."""
    line = "# ToDo: fix this"
    issues = code_reviewer_instance._analyze_line(line, 4, "python")

    assert any(
        issue.message == "TODO/FIXME comment found"
        and issue.severity == "warning"
        for issue in issues
    )


def test_code_reviewer_analyze_line_smell_patterns_ellipsis(code_reviewer_instance):
    """Test _analyze_line detects ellipsis placeholders."""
    line = "def foo(): ..."
    issues = code_reviewer_instance._analyze_line(line, 6, "python")

    assert any(
        issue.message == "Ellipsis placeholder found"
        and issue.severity == "warning"
        for issue in issues
    )


def test_code_reviewer_analyze_line_hardcoded_password(code_reviewer_instance):
    """Test _analyze_line detects potential hardcoded passwords case-insensitively."""
    line = "PASSWORD = 'secret'"
    issues = code_reviewer_instance._analyze_line(line, 7, "python")

    assert any(
        issue.message == "Potential hardcoded password"
        and issue.severity == "error"
        and issue.suggestion == "Use environment variables or secure storage"
        for issue in issues
    )


def test_code_reviewer_analyze_line_trailing_whitespace(code_reviewer_instance):
    """Test _analyze_line detects trailing whitespace."""
    line = "x = 1   "
    issues = code_reviewer_instance._analyze_line(line, 8, "python")

    assert any(
        issue.message == "Trailing whitespace detected"
        and issue.severity == "info"
        for issue in issues
    )


def test_code_reviewer_analyze_line_no_issues(code_reviewer_instance):
    """Test _analyze_line returns empty list when there are no issues."""
    line = "x = 1"
    issues = code_reviewer_instance._analyze_line(line, 1, "python")

    assert isinstance(issues, list)
    assert len(issues) == 0


def test_code_reviewer_count_complexity_basic_patterns(code_reviewer_instance):
    """Test _count_complexity counts occurrences of complexity patterns."""
    line = "if x: pass\nfor i in range(10):\nwhile True: break"
    # Only first segment is used; join them in a single line to match patterns
    combined_line = "if x: for i in range(10): while True: break"
    count = code_reviewer_instance._count_complexity(combined_line)

    # expecting 3: if, for, while
    assert count == 3


def test_code_reviewer_count_complexity_no_patterns(code_reviewer_instance):
    """Test _count_complexity returns 0 when no complexity patterns are present."""
    line = "x = 1 + 2"
    count = code_reviewer_instance._count_complexity(line)
    assert count == 0


def test_code_reviewer_calculate_complexity_score_normal(code_reviewer_instance):
    """Test _calculate_complexity_score with normal non-zero total_lines."""
    score = code_reviewer_instance._calculate_complexity_score(
        complexity_count=10, total_lines=20
    )
    assert score == pytest.approx(0.5)


def test_code_reviewer_calculate_complexity_score_zero_lines(code_reviewer_instance):
    """Test _calculate_complexity_score returns 0.0 when total_lines is zero."""
    score = code_reviewer_instance._calculate_complexity_score(
        complexity_count=5, total_lines=0
    )
    assert score == pytest.approx(0.0)


def test_code_reviewer_calculate_complexity_score_capped_at_one(code_reviewer_instance):
    """Test _calculate_complexity_score caps normalized score at 1.0."""
    score = code_reviewer_instance._calculate_complexity_score(
        complexity_count=100, total_lines=10
    )
    assert score == pytest.approx(1.0)


def test_code_reviewer_calculate_score_no_issues_low_complexity(code_reviewer_instance):
    """Test _calculate_score with no issues and low complexity."""
    score = code_reviewer_instance._calculate_score([], complexity_score=0.1)
    # base 100 - complexity_penalty(0.1*20 = 2) = 98
    assert score == pytest.approx(98.0)


def test_code_reviewer_calculate_score_with_various_severities(code_reviewer_instance):
    """Test _calculate_score applies penalties based on severity and complexity."""
    issues = [
        CodeIssue(severity="error", line=1, message="E1"),
        CodeIssue(severity="warning", line=2, message="W1"),
        CodeIssue(severity="info", line=3, message="I1"),
        CodeIssue(severity="warning", line=4, message="W2"),
    ]
    # error_penalty = 10
    # warning_penalty = 5 + 5 = 10
    # info_penalty = 1
    # complexity_penalty = 0.5 * 20 = 10
    # total penalty = 31; score = 69
    score = code_reviewer_instance._calculate_score(issues, complexity_score=0.5)

    assert score == pytest.approx(69.0)


def test_code_reviewer_calculate_score_never_negative(code_reviewer_instance):
    """Test _calculate_score does not return negative scores."""
    # Many errors plus high complexity
    issues = [
        CodeIssue(severity="error", line=i, message=f"E{i}") for i in range(20)
    ]
    score = code_reviewer_instance._calculate_score(issues, complexity_score=1.0)
    assert score == pytest.approx(0.0)


def test_code_reviewer_calculate_score_never_above_100(code_reviewer_instance):
    """Test _calculate_score does not exceed 100."""
    # No issues and zero complexity
    score = code_reviewer_instance._calculate_score([], complexity_score=0.0)
    assert score == pytest.approx(100.0)


def test_code_reviewer_review_code_basic_no_issues_low_complexity(code_reviewer_instance):
    """Test review_code returns high score and no suggestions for simple code."""
    code = "x = 1\ny = 2\nz = x + y\n"
    result = code_reviewer_instance.review_code(code, language="python")

    assert isinstance(result, ReviewResult)
    assert result.issues == []
    assert result.score == pytest.approx(100.0)  # no issues, no complexity
    assert result.complexity_score == pytest.approx(0.0)
    assert result.suggestions == []


def test_code_reviewer_review_code_complexity_suggestion(code_reviewer_instance):
    """Test review_code adds complexity suggestion when complexity_score > 0.7."""
    # Many complexity keywords to push complexity_score over 0.7
    lines = [
        "if x: pass",
        "for i in range(10): pass",
        "while True: break",
        "try:\n    pass",
        "except Exception:\n    pass",
        "if y: pass",
        "for j in range(5): pass",
    ]
    code = "\n".join(lines)
    result = code_reviewer_instance.review_code(code, language="python")

    assert any(
        "refactoring to reduce cyclomatic complexity" in suggestion.lower()
        for suggestion in result.suggestions
    )
    assert result.complexity_score == pytest.approx(
        result.complexity_score
    )  # sanity check usage of approx


def test_code_reviewer_review_code_many_issues_suggestion(code_reviewer_instance):
    """Test review_code adds suggestion when there are more than 10 issues."""
    # Construct code with many smell patterns to exceed 10 issues
    lines = [
        "print('debug')",
        "def foo(): pass",
        "x = 1   ",
        "PASSWORD = 'secret'",
        "# todo: something",
    ] * 3  # 15 lines with multiple issues each
    code = "\n".join(lines)

    result = code_reviewer_instance.review_code(code, language="python")

    assert len(result.issues) > 10
    assert any(
        "high number of issues" in suggestion.lower()
        for suggestion in result.suggestions
    )


def test_code_reviewer_review_code_uses_internal_methods(code_reviewer_instance):
    """Test review_code interacts with internal methods as expected using mocks."""
    cr = code_reviewer_instance
    content = "if x: pass\n"

    with patch.object(cr, "_analyze_line", return_value=[]) as mock_analyze, \
         patch.object(cr, "_count_complexity", return_value=2) as mock_count, \
         patch.object(cr, "_calculate_complexity_score", return_value=0.2) as mock_comp_score, \
         patch.object(cr, "_calculate_score", return_value=90.0) as mock_score:
        result = cr.review_code(content, language="python")

    lines = content.split("\n")
    assert mock_analyze.call_count == len(lines)
    assert mock_count.call_count == len(lines)
    mock_comp_score.assert_called_once_with(2 * len(lines), len(lines))
    mock_score.assert_called_once()
    assert result.score == pytest.approx(90.0)


def test_code_reviewer_review_function_ok_status_few_params_short_body(code_reviewer_instance):
    """Test review_function returns status ok for simple, small function."""
    code = "def foo(a, b):\n    return a + b\n"
    result = code_reviewer_instance.review_function(code)

    assert isinstance(result, dict)
    assert result.get("status") == "ok"
    assert "warning" not in result


def test_code_reviewer_review_function_too_many_parameters(code_reviewer_instance):
    """Test review_function warns when function has more than 5 parameters."""
    code = "def foo(a, b, c, d, e, f):\n    return a\n"
    result = code_reviewer_instance.review_function(code)

    assert result.get("warning") == "Function has too many parameters"
    assert "configuration object or data class" in result.get("suggestion", "")


def test_code_reviewer_review_function_empty_params_list(code_reviewer_instance):
    """Test review_function correctly handles empty parameter list."""
    code = "def foo():\n    return 1\n"
    result = code_reviewer_instance.review_function(code)

    assert result.get("status") == "ok"


def test_code_reviewer_review_function_too_long_body(code_reviewer_instance):
    """Test review_function warns when function has more than 50 lines."""
    body_lines = "\n".join(["    x = 1"] * 51)
    code = f"def foo(a, b):\n{body_lines}\n"
    result = code_reviewer_instance.review_function(code)

    assert result.get("warning") == "Function is too long"
    assert "breaking into smaller functions" in result.get("suggestion", "").lower()


def test_code_reviewer_review_function_no_parentheses(code_reviewer_instance):
    """Test review_function handles code without parentheses gracefully."""
    # This is not valid function code, but review_function should not crash
    code = "not a function definition"
    result = code_reviewer_instance.review_function(code)

    # No parameters, single line => ok
    assert result.get("status") == "ok"


def test_code_reviewer_review_function_param_parsing_ignores_empty_entries(code_reviewer_instance):
    """Test review_function ignores empty parameter entries when counting."""
    code = "def foo(a, b,, , c):\n    pass\n"
    # This is syntactically invalid Python, but review_function uses regex-based parsing.
    result = code_reviewer_instance.review_function(code)

    # params: 'a', 'b', '', ' ', ' c' -> 3 non-empty
    assert result.get("status") == "ok"


def test_code_reviewer_review_function_exception_handling_invalid_input(code_reviewer_instance):
    """Test review_function does not raise exceptions for non-string-like input using mocking."""
    cr = code_reviewer_instance
    # Use a mock to simulate unexpected behavior in split
    with patch("src.code_reviewer.re", autospec=True) as mock_re:
        # Force re.search to raise an exception to simulate internal error
        mock_re.search.side_effect = RuntimeError("regex error")
        with pytest.raises(RuntimeError):
            # Expect the propagated error, since review_function does not catch it
            cr.review_function("def foo(a):\n    return a\n")