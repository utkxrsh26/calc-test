import pytest
from unittest.mock import patch

from src.code_reviewer import CodeIssue, ReviewResult, CodeReviewer


@pytest.fixture
def reviewer():
    """Provide a fresh CodeReviewer instance for tests."""
    return CodeReviewer()


def test_codeissue_dataclass_initialization():
    """Test CodeIssue dataclass stores provided values correctly."""
    issue = CodeIssue(severity="error", line=10, message="Test message", suggestion="Fix it")
    assert issue.severity == "error"
    assert issue.line == 10
    assert issue.message == "Test message"
    assert issue.suggestion == "Fix it"


def test_reviewresult_dataclass_initialization():
    """Test ReviewResult dataclass initialization with values."""
    issues = [CodeIssue(severity="warning", line=1, message="Warn")]
    result = ReviewResult(score=95.0, issues=issues, suggestions=["Check it"], complexity_score=0.1)
    assert result.score == pytest.approx(95.0)
    assert result.issues == issues
    assert result.suggestions == ["Check it"]
    assert result.complexity_score == pytest.approx(0.1)


def test_codereviewer_init_default_patterns(reviewer):
    """Test CodeReviewer initialization sets complexity and smell patterns."""
    assert isinstance(reviewer.complexity_patterns, list)
    assert len(reviewer.complexity_patterns) == 7

    assert isinstance(reviewer.smell_patterns, list)
    assert len(reviewer.smell_patterns) == 4

    # The TODO/FIXME/HACK/XXX pattern is case-insensitive with IGNORECASE flag
    pattern, message, flag = reviewer.smell_patterns[2]
    assert "todo" in pattern
    assert "FIXME" in message or "TODO" in message
    import re as _re
    assert flag == _re.IGNORECASE


def test_codereviewer_analyze_line_semicolon_smells_password(reviewer):
    """Test _analyze_line detects semicolon, print, TODO, and hardcoded password in a single line."""
    line = 'print("x"); PASSWORD = "123"  # TODO fix'
    issues = reviewer._analyze_line(line, 1, language="python")

    messages = {i.message for i in issues}
    severities = [i.severity for i in issues]

    assert "Unnecessary semicolon in Python" in messages
    assert "Debug print statement found" in messages
    assert "TODO/FIXME comment found" in messages
    assert "Potential hardcoded password" in messages

    # Expect 4 issues: one info, two warnings (print + TODO), one error (password)
    assert severities.count("info") == 1
    assert severities.count("warning") == 2
    assert severities.count("error") == 1


def test_codereviewer_analyze_line_long_line(reviewer):
    """Test _analyze_line flags lines exceeding 120 characters."""
    line = "a" * 121
    issues = reviewer._analyze_line(line, 3, language="python")
    assert len(issues) == 1
    assert issues[0].severity == "warning"
    assert issues[0].line == 3
    assert issues[0].message == "Line exceeds 120 characters"
    assert issues[0].suggestion == "Consider breaking into multiple lines"


def test_codereviewer_count_complexity_multiple_patterns(reviewer):
    """Test _count_complexity counts each complexity-triggering keyword once per pattern in a line."""
    line = "if x: for y in z: while a: try: pass except E: switch v: case 1:"
    count = reviewer._count_complexity(line)
    assert count == 7


def test_codereviewer_count_complexity_single_pattern_once(reviewer):
    """Test _count_complexity counts a single pattern only once even if it appears multiple times in a line."""
    line = "if x: if y: if z:"
    count = reviewer._count_complexity(line)
    assert count == 1


def test_calculate_complexity_score_zero_lines(reviewer):
    """Test _calculate_complexity_score returns 0.0 when total_lines is zero."""
    score = reviewer._calculate_complexity_score(complexity_count=10, total_lines=0)
    assert score == pytest.approx(0.0)


def test_calculate_complexity_score_capped_to_one(reviewer):
    """Test _calculate_complexity_score is capped at 1.0 when normalized value exceeds 1.0."""
    score = reviewer._calculate_complexity_score(complexity_count=150, total_lines=100)
    assert score == pytest.approx(1.0)


def test_calculate_complexity_score_normal(reviewer):
    """Test _calculate_complexity_score computes normalized ratio."""
    score = reviewer._calculate_complexity_score(complexity_count=8, total_lines=10)
    assert score == pytest.approx(0.8)


def test_calculate_score_various_severities(reviewer):
    """Test _calculate_score with mixed severities and non-zero complexity."""
    issues = (
        [CodeIssue(severity="error", line=1, message="e")] * 2
        + [CodeIssue(severity="warning", line=2, message="w")] * 3
        + [CodeIssue(severity="info", line=3, message="i")] * 4
    )
    score = reviewer._calculate_score(issues, complexity_score=0.5)
    # error: 2*10 = 20, warning: 3*5 = 15, info: 4*1 = 4, complexity: 0.5*20 = 10; total penalty = 49; score = 51
    assert score == pytest.approx(51.0)


def test_calculate_score_clamped_to_zero(reviewer):
    """Test _calculate_score clamps at 0.0 for excessive penalties."""
    issues = [CodeIssue(severity="error", line=i + 1, message="e") for i in range(15)]
    score = reviewer._calculate_score(issues, complexity_score=1.0)
    assert score == pytest.approx(0.0)


def test_review_code_empty_content(reviewer):
    """Test review_code on empty content yields perfect score and no issues."""
    result = reviewer.review_code("", language="python")
    assert result.score == pytest.approx(100.0)
    assert result.issues == []
    assert result.suggestions == []
    assert result.complexity_score == pytest.approx(0.0)


def test_review_code_complexity_suggestion(reviewer):
    """Test review_code suggests refactoring when complexity score exceeds 0.7."""
    content = "\n".join(["if x:" for _ in range(10)])  # 10 lines, each with 'if ' => complexity_score = 1.0
    result = reviewer.review_code(content, language="python")

    assert result.complexity_score == pytest.approx(1.0)
    assert "Consider refactoring to reduce cyclomatic complexity" in result.suggestions
    assert len(result.issues) == 0
    assert result.score == pytest.approx(80.0)  # 100 - (1.0 * 20)


def test_review_code_high_issue_count_suggestion_and_score(reviewer):
    """Test review_code adds suggestion for high number of issues and computes score correctly."""
    content = "\n".join(["print('x')" for _ in range(11)])  # 11 warning issues
    result = reviewer.review_code(content, language="python")

    assert len(result.issues) == 11
    assert "High number of issues detected. Consider code review" in result.suggestions
    assert result.complexity_score == pytest.approx(0.0)
    assert result.score == pytest.approx(45.0)  # 100 - 11 * 5


def test_review_code_language_no_semicolon_in_non_python(reviewer):
    """Test semicolon at end of line is not flagged when language is not Python."""
    content = "a = 1;"
    result = reviewer.review_code(content, language="javascript")
    assert len(result.issues) == 0
    assert result.score == pytest.approx(100.0)
    assert result.complexity_score == pytest.approx(0.0)


def test_review_code_with_mocked_methods_for_issue_threshold_and_score(reviewer):
    """Test review_code with mocked analysis to trigger high-issue suggestion and expected score."""
    mocked_issues = [CodeIssue(severity="warning", line=1, message=f"w{i}") for i in range(12)]

    with patch.object(CodeReviewer, "_analyze_line", return_value=mocked_issues), \
         patch.object(CodeReviewer, "_count_complexity", return_value=0):
        result = reviewer.review_code("x", language="python")

    assert len(result.issues) == 12
    assert "High number of issues detected. Consider code review" in result.suggestions
    assert result.complexity_score == pytest.approx(0.0)
    assert result.score == pytest.approx(40.0)  # 100 - 12 * 5


def test_review_code_propagates_exception_from_analyze_line(reviewer):
    """Test that exceptions raised during analysis are propagated (no swallowing)."""
    with patch.object(CodeReviewer, "_analyze_line", side_effect=RuntimeError("boom")):
        with pytest.raises(RuntimeError):
            reviewer.review_code("x", language="python")


def test_review_function_param_count_too_many(reviewer):
    """Test review_function flags functions with more than 5 parameters."""
    function_code = "def foo(a, b, c, d, e, f):\n    return 1"
    result = reviewer.review_function(function_code)
    assert result["warning"] == "Function has too many parameters"
    assert result["suggestion"] == "Consider using a configuration object or data class"


def test_review_function_length_too_long(reviewer):
    """Test review_function flags functions exceeding 50 lines."""
    function_code = "def foo():\n" + "\n".join("    x = 1" for _ in range(51))
    result = reviewer.review_function(function_code)
    assert result["warning"] == "Function is too long"
    assert result["suggestion"] == "Consider breaking into smaller functions"


def test_review_function_ok(reviewer):
    """Test review_function returns ok for small, simple functions."""
    function_code = "def foo(a, b=1):\n    return a + b"
    result = reviewer.review_function(function_code)
    assert result == {"status": "ok"}