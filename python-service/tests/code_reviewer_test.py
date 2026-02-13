import re
import pytest
from unittest.mock import patch

from src.code_reviewer import CodeIssue, ReviewResult, CodeReviewer


@pytest.fixture
def reviewer():
    """Provide a CodeReviewer instance for tests."""
    return CodeReviewer()


def test_CodeIssue_dataclass_initialization():
    """Test CodeIssue dataclass initialization and defaults."""
    issue = CodeIssue(severity="warning", line=10, message="Test message")
    assert issue.severity == "warning"
    assert issue.line == 10
    assert issue.message == "Test message"
    assert issue.suggestion is None


def test_ReviewResult_dataclass_initialization():
    """Test ReviewResult dataclass initialization with explicit values."""
    result = ReviewResult(
        score=88.5,
        issues=[],
        suggestions=["Consider refactoring"],
        complexity_score=0.3,
    )
    assert result.score == pytest.approx(88.5)
    assert result.issues == []
    assert result.suggestions == ["Consider refactoring"]
    assert result.complexity_score == pytest.approx(0.3)


def test_CodeReviewer_init_default_patterns(reviewer):
    """Ensure CodeReviewer initializes with expected complexity and smell patterns."""
    assert isinstance(reviewer.complexity_patterns, list)
    assert isinstance(reviewer.smell_patterns, list)
    assert len(reviewer.complexity_patterns) == 7
    assert len(reviewer.smell_patterns) == 4

    # Check that the TODO/FIXME pattern has IGNORECASE flag
    todo_pattern = reviewer.smell_patterns[2]
    assert todo_pattern[0] == r"todo|fixme|hack|xxx"
    assert todo_pattern[1] == "TODO/FIXME comment found"
    assert todo_pattern[2] == re.IGNORECASE


def test_CodeReviewer_count_complexity_multiple_constructs(reviewer):
    """_count_complexity should count distinct constructs on the same line."""
    line = "if x: for i in range(10): try: pass"
    count = reviewer._count_complexity(line)
    assert count == 3


def test_CodeReviewer_count_complexity_duplicate_constructs_in_line_once(reviewer):
    """_count_complexity should count a construct at most once per pattern per line."""
    line = "if x: if y: pass"
    count = reviewer._count_complexity(line)
    assert count == 1


def test_CodeReviewer_calculate_complexity_score_edges(reviewer):
    """_calculate_complexity_score should handle zero lines and cap at 1.0."""
    assert reviewer._calculate_complexity_score(0, 0) == pytest.approx(0.0)
    assert reviewer._calculate_complexity_score(7, 10) == pytest.approx(0.7)
    assert reviewer._calculate_complexity_score(100, 10) == pytest.approx(1.0)


def test_CodeReviewer_analyze_line_length_and_semicolon_python(reviewer):
    """_analyze_line should flag long lines and semicolons for Python."""
    long_line = "x = 1;" + "a" * 130  # exceeds 120, ends with semicolon
    issues = reviewer._analyze_line(long_line, 1, "python")
    messages = {i.message for i in issues}
    severities = {i.severity for i in issues}
    assert "Line exceeds 120 characters" in messages
    assert "Unnecessary semicolon in Python" in messages
    assert "warning" in severities
    assert "info" in severities


def test_CodeReviewer_analyze_line_semicolon_non_python(reviewer):
    """_analyze_line should not flag semicolons for non-Python languages."""
    line = "x = 1;    "
    issues = reviewer._analyze_line(line, 1, "javascript")
    assert issues == []


def test_CodeReviewer_analyze_line_smells_and_password(reviewer):
    """_analyze_line should detect smells and hardcoded passwords."""
    # Empty function
    issues_empty = reviewer._analyze_line("def foo(a, b): pass", 2, "python")
    assert any(i.message == "Empty function detected" and i.severity == "warning" for i in issues_empty)

    # Debug print
    issues_print = reviewer._analyze_line("print('debug')", 3, "python")
    assert any(i.message == "Debug print statement found" and i.severity == "warning" for i in issues_print)

    # TODO case-insensitive
    issues_todo = reviewer._analyze_line("# TODO: fix this", 4, "python")
    assert any(i.message == "TODO/FIXME comment found" and i.severity == "warning" for i in issues_todo)

    # Ellipsis placeholder
    issues_ellipsis = reviewer._analyze_line("x = ...", 5, "python")
    assert any(i.message == "Ellipsis placeholder found" and i.severity == "warning" for i in issues_ellipsis)

    # Hardcoded password, case-insensitive
    issues_pwd = reviewer._analyze_line('PASSWORD = "secret"', 6, "python")
    assert any(i.message == "Potential hardcoded password" and i.severity == "error" for i in issues_pwd)


def test_CodeReviewer_review_code_no_issues(reviewer):
    """review_code should return perfect score when there are no issues."""
    content = "x = 1\ny = 2"
    res = reviewer.review_code(content)
    assert isinstance(res, ReviewResult)
    assert res.issues == []
    assert res.suggestions == []
    assert res.complexity_score == pytest.approx(0.0)
    assert res.score == pytest.approx(100.0)


def test_CodeReviewer_review_code_single_warning_score(reviewer):
    """review_code should include smell issues and reflect them in the score."""
    content = "print('hello')"
    res = reviewer.review_code(content)
    assert any(i.message == "Debug print statement found" and i.severity == "warning" for i in res.issues)
    assert res.complexity_score == pytest.approx(0.0)
    assert res.score == pytest.approx(95.0)


def test_CodeReviewer_review_code_many_issues_suggestion(reviewer):
    """review_code should add a suggestion when the number of issues exceeds 10."""
    content = "\n".join(["print('x')"] * 11)
    res = reviewer.review_code(content)
    assert any("High number of issues detected. Consider code review" in s for s in res.suggestions)
    # 11 warnings => 11*5 penalty
    assert res.score == pytest.approx(100 - 11 * 5)


def test_CodeReviewer_review_code_high_complexity_suggestion_and_score(reviewer):
    """review_code should add complexity suggestion when complexity is high and reduce score."""
    lines = ["if cond:" for _ in range(8)] + ["", ""]
    content = "\n".join(lines)
    res = reviewer.review_code(content)
    assert any("Consider refactoring to reduce cyclomatic complexity" in s for s in res.suggestions)
    assert res.complexity_score == pytest.approx(0.8)
    # Complexity penalty = 0.8 * 20 = 16, no other issues
    assert res.score == pytest.approx(84.0)


def test_CodeReviewer_calculate_score_various_and_clamp(reviewer):
    """_calculate_score should aggregate penalties and clamp between 0 and 100."""
    issues = (
        [CodeIssue(severity="error", line=1, message="e")] * 2
        + [CodeIssue(severity="warning", line=2, message="w")] * 3
        + [CodeIssue(severity="info", line=3, message="i")] * 4
    )
    score = reviewer._calculate_score(issues, complexity_score=0.5)
    # 2*10 + 3*5 + 4*1 + (0.5*20) = 20 + 15 + 4 + 10 = 49 penalty
    assert score == pytest.approx(51.0)

    many_errors = [CodeIssue(severity="error", line=i + 1, message="e") for i in range(11)]
    score_zero = reviewer._calculate_score(many_errors, complexity_score=1.0)
    # Penalty certainly > 100, should clamp at 0
    assert score_zero == pytest.approx(0.0)


def test_CodeReviewer_count_complexity_calls_re_search_mocked(reviewer):
    """_count_complexity should invoke re.search once per complexity pattern."""
    side_effects = [None, object(), None, None, object(), None, None]
    with patch("src.code_reviewer.re.search", side_effect=side_effects) as mock_search:
        result = reviewer._count_complexity("irrelevant line content")
        assert mock_search.call_count == len(reviewer.complexity_patterns)
        # Two truthy results
        assert result == 2


def test_CodeReviewer_review_code_uses_internal_methods_with_mocks(reviewer):
    """review_code should use _analyze_line and _count_complexity to build results."""
    fake_issue = CodeIssue(severity="warning", line=1, message="mocked")
    with patch.object(CodeReviewer, "_analyze_line", return_value=[fake_issue]) as mock_analyze, patch.object(
        CodeReviewer, "_count_complexity", return_value=1
    ) as mock_complexity:
        content = "a\nb\nc"
        res = reviewer.review_code(content)
        # Called for each line
        assert mock_analyze.call_count == 3
        assert mock_complexity.call_count == 3
        # Complexity: 3/3 = 1.0
        assert res.complexity_score == pytest.approx(1.0)
        # 3 warnings (3*5=15) + complexity penalty (1.0*20=20) => 65 score
        assert res.score == pytest.approx(65.0)
        assert any("Consider refactoring to reduce cyclomatic complexity" in s for s in res.suggestions)


def test_CodeReviewer_review_function_param_count_too_many(reviewer):
    """review_function should warn when too many parameters are present."""
    fn_code = "def f(a, b, c, d, e, f, g):\n    pass"
    res = reviewer.review_function(fn_code)
    assert res["warning"] == "Function has too many parameters"
    assert "data class" in res["suggestion"] or "data class" in res["suggestion"].lower()


def test_CodeReviewer_review_function_too_long(reviewer):
    """review_function should warn when function is too long."""
    lines = ["def f(a):"] + ["    pass"] * 51
    fn_code = "\n".join(lines)
    res = reviewer.review_function(fn_code)
    assert res["warning"] == "Function is too long"
    assert "breaking into smaller functions" in res["suggestion"].lower()


def test_CodeReviewer_review_function_ok_edge_cases(reviewer):
    """review_function should return ok when parameters <= 5 and not too long."""
    fn_code = "def f(a, b, c, d, e):\n    pass\n"
    res = reviewer.review_function(fn_code)
    assert res["status"] == "ok"

    # No parentheses present should be considered ok unless too long
    res2 = reviewer.review_function("function body without parentheses")
    assert res2["status"] == "ok"