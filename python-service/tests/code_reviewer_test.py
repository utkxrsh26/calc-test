import pytest
from unittest.mock import patch, call
from src.code_reviewer import CodeIssue, ReviewResult, CodeReviewer


@pytest.fixture
def reviewer():
    """Provide a fresh CodeReviewer instance for each test."""
    return CodeReviewer()


def test_codeissue_dataclass_defaults():
    """CodeIssue should initialize with given fields and default suggestion None."""
    issue = CodeIssue(severity="warning", line=3, message="Test message")
    assert issue.severity == "warning"
    assert issue.line == 3
    assert issue.message == "Test message"
    assert issue.suggestion is None


def test_reviewresult_dataclass_initialization():
    """ReviewResult should initialize with provided fields correctly."""
    issues = [
        CodeIssue(severity="warning", line=1, message="m1"),
        CodeIssue(severity="error", line=2, message="m2"),
    ]
    result = ReviewResult(score=88.5, issues=issues, suggestions=["s1"], complexity_score=0.3)
    assert result.score == pytest.approx(88.5)
    assert result.issues == issues
    assert result.suggestions == ["s1"]
    assert result.complexity_score == pytest.approx(0.3)


def test_codereviewer_init_patterns(reviewer):
    """CodeReviewer initialization should set expected complexity and smell patterns."""
    assert isinstance(reviewer.complexity_patterns, list)
    assert isinstance(reviewer.smell_patterns, list)
    # Expect exact number of patterns as defined in source
    assert len(reviewer.complexity_patterns) == 7
    assert len(reviewer.smell_patterns) == 4
    # Ensure the todo/fixme pattern has IGNORECASE flag
    todo_pattern = reviewer.smell_patterns[2]
    assert "todo" in todo_pattern[0]
    assert todo_pattern[2] != 0


def test_analyze_line_long_line_thresholds(reviewer):
    """_analyze_line should warn for lines >120 chars and not for exactly 120."""
    line_120 = "a" * 120
    issues_120 = reviewer._analyze_line(line_120, 1, "python")
    assert all("Line exceeds 120 characters" != i.message for i in issues_120)

    line_121 = "a" * 121
    issues_121 = reviewer._analyze_line(line_121, 2, "python")
    assert any(i.message == "Line exceeds 120 characters" and i.severity == "warning" for i in issues_121)


def test_analyze_line_semicolon_python_vs_other(reviewer):
    """_analyze_line should flag semicolon in Python but not in other languages."""
    py_issues = reviewer._analyze_line("x = 1;", 1, "python")
    assert any(i.message == "Unnecessary semicolon in Python" and i.severity == "info" for i in py_issues)

    js_issues = reviewer._analyze_line("x = 1;", 1, "javascript")
    assert all(i.message != "Unnecessary semicolon in Python" for i in js_issues)


def test_analyze_line_smell_patterns(reviewer):
    """_analyze_line should detect various code smells."""
    empty_func_line = "def foo(): pass"
    issues_empty = reviewer._analyze_line(empty_func_line, 1, "python")
    assert any(i.message == "Empty function detected" and i.severity == "warning" for i in issues_empty)

    print_line = "print('debug')"
    issues_print = reviewer._analyze_line(print_line, 2, "python")
    assert any(i.message == "Debug print statement found" and i.severity == "warning" for i in issues_print)

    todo_line = "# FiXMe: handle this"
    issues_todo = reviewer._analyze_line(todo_line, 3, "python")
    assert any(i.message == "TODO/FIXME comment found" and i.severity == "warning" for i in issues_todo)

    ellipsis_line = "..."
    issues_ellipsis = reviewer._analyze_line(ellipsis_line, 4, "python")
    assert any(i.message == "Ellipsis placeholder found" and i.severity == "warning" for i in issues_ellipsis)


def test_analyze_line_hardcoded_password(reviewer):
    """_analyze_line should detect potential hardcoded passwords with error severity."""
    line = 'PASSWORD = "secret"'
    issues = reviewer._analyze_line(line, 10, "python")
    assert any(
        i.message == "Potential hardcoded password"
        and i.severity == "error"
        and i.suggestion == "Use environment variables or secure storage"
        for i in issues
    )


def test_count_complexity_multiple_patterns_one_line(reviewer):
    """_count_complexity should count all matched complexity indicators per line."""
    line = "if x: for y in z: pass"
    count = reviewer._count_complexity(line)
    assert count == 2


def test_calculate_complexity_score_zero_lines(reviewer):
    """_calculate_complexity_score should return 0.0 when total_lines is 0."""
    score = reviewer._calculate_complexity_score(5, 0)
    assert score == pytest.approx(0.0)


def test_calculate_complexity_score_normalization_and_clamp(reviewer):
    """_calculate_complexity_score should normalize and clamp to 1.0."""
    score_norm = reviewer._calculate_complexity_score(5, 20)
    assert score_norm == pytest.approx(0.25)

    score_clamp = reviewer._calculate_complexity_score(50, 10)
    assert score_clamp == pytest.approx(1.0)


def test_calculate_score_basic_and_bounds(reviewer):
    """_calculate_score should compute penalties correctly and clamp between 0 and 100."""
    # No issues, no complexity
    issues = []
    score = reviewer._calculate_score(issues, 0.0)
    assert score == pytest.approx(100.0)

    # Mixed severities with complexity 0.5
    issues = (
        [CodeIssue("error", 1, "e1"), CodeIssue("error", 2, "e2")]  # 20
        + [CodeIssue("warning", 3, "w")] * 3  # 15
        + [CodeIssue("info", 4, "i")] * 4  # 4
    )
    score2 = reviewer._calculate_score(issues, 0.5)  # complexity penalty 10
    assert score2 == pytest.approx(51.0)

    # Heavy penalties => clamp to 0
    issues_heavy = [CodeIssue("error", i, "e") for i in range(50)]
    score3 = reviewer._calculate_score(issues_heavy, 1.0)
    assert score3 == pytest.approx(0.0)


def test_review_function_param_count_warning(reviewer):
    """review_function should warn when parameter count exceeds 5."""
    code = "def f(a, b, c, d, e, f):\n    pass"
    result = reviewer.review_function(code)
    assert result["warning"] == "Function has too many parameters"
    assert "Consider using a configuration object or data class" in result["suggestion"]


def test_review_function_too_long_warning(reviewer):
    """review_function should warn when function has more than 50 lines."""
    body = "\n".join(["    pass"] * 51)
    code = "def f():\n" + body
    result = reviewer.review_function(code)
    assert result["warning"] == "Function is too long"
    assert "Consider breaking into smaller functions" in result["suggestion"]


def test_review_function_ok(reviewer):
    """review_function should return ok for small, simple functions."""
    code = "def f(a, b, c, d, e):\n    return a + b + c + d + e"
    result = reviewer.review_function(code)
    assert result == {"status": "ok"}


def test_review_code_calls_internal_methods_and_suggestions_with_mock():
    """review_code should call internal methods per line and add complexity suggestion when >0.7."""
    content = "line1\nline2\nline3\nline4\nline5"
    with patch.object(CodeReviewer, "_analyze_line", return_value=[]) as mock_analyze, \
         patch.object(CodeReviewer, "_count_complexity", return_value=1) as mock_count, \
         patch.object(CodeReviewer, "_calculate_score", return_value=77.7) as mock_calc:
        reviewer = CodeReviewer()
        result = reviewer.review_code(content, language="js")

        # Called once per line with correct language
        assert mock_analyze.call_count == 5
        # Verify at least first call signature
        assert mock_analyze.mock_calls[0] == call("line1", 1, "js")
        assert mock_count.call_count == 5

        # Complexity score should be 1.0 and suggestion present
        assert result.complexity_score == pytest.approx(1.0)
        assert "Consider refactoring to reduce cyclomatic complexity" in result.suggestions

        # Score is from mocked calculator
        assert result.score == pytest.approx(77.7)


def test_review_code_boundary_no_suggestions(reviewer):
    """review_code should not add suggestions when complexity_score == 0.7 and issues == 10."""
    # 7 lines with 'if ' for complexity and print for 7 issues; 3 lines with '...' for 3 more issues
    lines = []
    lines += ["if True: print('x')"] * 7  # 7 complexity, 7 issues
    lines += ["..."] * 3  # +3 issues, total 10
    content = "\n".join(lines)

    result = reviewer.review_code(content)

    assert len(result.issues) == 10
    # complexity 7/10 == 0.7, no suggestion for complexity
    assert result.complexity_score == pytest.approx(0.7)
    assert "Consider refactoring to reduce cyclomatic complexity" not in result.suggestions
    # issues == 10, not greater than 10, so no high issues suggestion
    assert "High number of issues detected. Consider code review" not in result.suggestions


def test_review_code_integration_suggestions_added_and_score(reviewer):
    """review_code should add both suggestions when complexity > 0.7 and issues > 10, with correct score."""
    lines = []
    # 8 lines with 'if' and 'print' => 8 complexity hits and 8 warning issues
    lines += ["if True: print('x')"] * 8
    # 1 long print line with semicolon => 2 warnings + 1 info
    long_print = 'print("' + ("a" * 121) + '");'
    lines.append(long_print)
    # 1 hardcoded password error line
    lines.append('password = "secret"')
    content = "\n".join(lines)

    result = reviewer.review_code(content)
    # complexity: 8/10 = 0.8
    assert result.complexity_score == pytest.approx(0.8)

    # issues: 8 (print warnings) + 2 (long line + print) + 1 (semicolon info) + 1 (password error) = 12
    assert len(result.issues) == 12

    # Suggestions
    assert "Consider refactoring to reduce cyclomatic complexity" in result.suggestions
    assert "High number of issues detected. Consider code review" in result.suggestions

    # Score calculation:
    # errors: 1 -> 10
    # warnings: 10 -> 50
    # info: 1 -> 1
    # complexity penalty: 0.8 * 20 = 16
    # total penalty: 77, score = 23
    assert result.score == pytest.approx(23.0)


def test_review_code_language_param_no_semicolon_issue(reviewer):
    """review_code should not flag semicolon when language is not python."""
    content = "x = 1;"
    result = reviewer.review_code(content, language="javascript")
    assert len(result.issues) == 0
    assert result.complexity_score == pytest.approx(0.0)
    assert result.score == pytest.approx(100.0)
    assert result.suggestions == []


def test_review_code_exception_propagates():
    """review_code should propagate exceptions from _analyze_line (no internal handling)."""
    with patch.object(CodeReviewer, "_analyze_line", side_effect=RuntimeError("boom")):
        reviewer = CodeReviewer()
        with pytest.raises(RuntimeError):
            reviewer.review_code("something\nelse")