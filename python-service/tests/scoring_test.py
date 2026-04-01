import pytest
from unittest.mock import Mock, patch

from src.scoring import apply_penalty, calculate_final_score, adjust_score_for_complexity


@pytest.fixture
def base_score():
    """Provide a standard base score for tests."""
    return 100.0


@pytest.fixture
def mock_issue():
    """Provide a basic mock CodeIssue object."""
    issue = Mock()
    issue.severity = "warning"
    return issue


@pytest.mark.parametrize(
    "initial_score, penalty, expected",
    [
        (100.0, 0.0, 100.0),
        (100.0, 10.0, 90.0),
        (50.0, 60.0, 0.0),
        (0.0, 10.0, 0.0),
        (10.0, -5.0, 15.0),
    ],
)
def test_apply_penalty_various_cases(initial_score, penalty, expected):
    """Test apply_penalty with various penalty amounts including over-penalty and negative penalty."""
    result = apply_penalty(initial_score, penalty)
    assert result == pytest.approx(expected)


def test_apply_penalty_does_not_go_below_zero():
    """Test apply_penalty never produces a negative score."""
    result = apply_penalty(5.0, 100.0)
    assert result == pytest.approx(0.0)
    assert result >= 0.0


@pytest.mark.parametrize(
    "severities, expected_penalty_total",
    [
        ([], 0.0),
        (["error"], 10.0),
        (["warning"], 5.0),
        (["info"], 1.0),
        (["error", "warning", "info"], 16.0),
        (["error", "error", "error"], 30.0),
        (["warning", "warning"], 10.0),
        (["info", "info", "info"], 3.0),
    ],
)
def test_calculate_final_score_severity_penalties(base_score, severities, expected_penalty_total):
    """Test calculate_final_score applies penalties based on issue severities."""
    issues = []
    for sev in severities:
        issue = Mock()
        issue.severity = sev
        issues.append(issue)

    result = calculate_final_score(issues, base_score=base_score)
    expected_score = base_score - expected_penalty_total
    if expected_score < 0:
        expected_score = 0.0
    assert result == pytest.approx(expected_score)


def test_calculate_final_score_uses_default_base_score():
    """Test calculate_final_score uses default base score when not provided."""
    issues = []
    result = calculate_final_score(issues)
    assert result == pytest.approx(100.0)


def test_calculate_final_score_with_unknown_severity():
    """Test calculate_final_score applies 'else' penalty for unknown severities."""
    issue = Mock()
    issue.severity = "unknown_severity"
    issues = [issue]

    result = calculate_final_score(issues, base_score=50.0)
    # Unknown severity falls into else: penalty = 1.0
    assert result == pytest.approx(49.0)


def test_calculate_final_score_multiple_issues_accumulate(base_score):
    """Test calculate_final_score accumulates penalties across multiple issues."""
    error_issue = Mock(severity="error")
    warning_issue = Mock(severity="warning")
    info_issue = Mock(severity="info")
    issues = [error_issue, warning_issue, info_issue]

    result = calculate_final_score(issues, base_score=base_score)
    # 10 + 5 + 1 = 16 penalty
    assert result == pytest.approx(base_score - 16.0)


def test_calculate_final_score_calls_apply_penalty_for_each_issue(base_score):
    """Test calculate_final_score delegates penalty application to apply_penalty for each issue."""
    issues = [Mock(severity="error"), Mock(severity="warning")]

    with patch("src.scoring.apply_penalty", wraps=apply_penalty) as mocked_apply_penalty:
        result = calculate_final_score(issues, base_score=base_score)

    # Two issues -> apply_penalty called twice
    assert mocked_apply_penalty.call_count == 2
    # Check that the final result is logically consistent
    assert result == pytest.approx(base_score - 15.0)


@pytest.mark.parametrize(
    "initial_score, complexity, expected_penalty",
    [
        (100.0, 0.0, 0.0),
        (100.0, 0.5, 10.0),
        (100.0, 1.0, 20.0),
        (50.0, 2.0, 40.0),
    ],
)
def test_adjust_score_for_complexity_positive_complexity(initial_score, complexity, expected_penalty):
    """Test adjust_score_for_complexity applies penalty proportional to complexity."""
    result = adjust_score_for_complexity(initial_score, complexity)
    expected_score = initial_score - expected_penalty
    if expected_score < 0:
        expected_score = 0.0
    assert result == pytest.approx(expected_score)


def test_adjust_score_for_complexity_zero_penalty(base_score):
    """Test adjust_score_for_complexity leaves score unchanged when complexity is zero."""
    result = adjust_score_for_complexity(base_score, 0.0)
    assert result == pytest.approx(base_score)


def test_adjust_score_for_complexity_negative_complexity_increases_score(base_score):
    """Test adjust_score_for_complexity can increase score when complexity is negative."""
    # complexity * 20 => negative penalty -> apply_penalty receives negative amount => score increases
    complexity = -1.0
    expected_penalty = complexity * 20  # -20
    result = adjust_score_for_complexity(base_score, complexity)
    expected_score = base_score - expected_penalty
    assert result == pytest.approx(expected_score)


def test_adjust_score_for_complexity_calls_apply_penalty_when_penalty_nonzero(base_score):
    """Test adjust_score_for_complexity calls apply_penalty when computed penalty is greater than zero."""
    complexity = 1.5  # penalty = 30 > 0
    with patch("src.scoring.apply_penalty", wraps=apply_penalty) as mocked_apply_penalty:
        result = adjust_score_for_complexity(base_score, complexity)

    mocked_apply_penalty.assert_called_once()
    assert result == pytest.approx(base_score - complexity * 20)


def test_adjust_score_for_complexity_does_not_call_apply_penalty_when_penalty_zero(base_score):
    """Test adjust_score_for_complexity does not call apply_penalty when complexity leads to zero penalty."""
    complexity = 0.0
    with patch("src.scoring.apply_penalty", wraps=apply_penalty) as mocked_apply_penalty:
        result = adjust_score_for_complexity(base_score, complexity)

    mocked_apply_penalty.assert_not_called()
    assert result == pytest.approx(base_score)


def test_adjust_score_for_complexity_score_never_negative():
    """Test adjust_score_for_complexity never produces a negative score when penalty is positive."""
    score = 10.0
    complexity = 10.0  # penalty = 200
    result = adjust_score_for_complexity(score, complexity)
    assert result == pytest.approx(0.0)
    assert result >= 0.0