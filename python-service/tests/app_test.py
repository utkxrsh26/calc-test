import sys
import types
from types import SimpleNamespace
from unittest.mock import Mock
import pytest

# Ensure src.code_reviewer import works by stubbing before importing src.app
if "src.code_reviewer" not in sys.modules:
    dummy_module = types.ModuleType("src.code_reviewer")

    class CodeReviewer:  # noqa: N801 (match expected class name)
        def review_code(self, content, language):
            raise NotImplementedError

        def review_function(self, function_code):
            raise NotImplementedError

    dummy_module.CodeReviewer = CodeReviewer
    sys.modules["src.code_reviewer"] = dummy_module

from src.app import app, reviewer  # noqa: E402


@pytest.fixture
def client():
    """Provide a Flask test client."""
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


@pytest.fixture
def reviewer_mocks():
    """Replace reviewer's methods with mocks and restore after tests."""
    original_review_code = getattr(reviewer, "review_code", None)
    original_review_function = getattr(reviewer, "review_function", None)

    review_code_mock = Mock(name="review_code")
    review_function_mock = Mock(name="review_function")

    reviewer.review_code = review_code_mock
    reviewer.review_function = review_function_mock

    try:
        yield reviewer, review_code_mock, review_function_mock
    finally:
        if original_review_code is not None:
            reviewer.review_code = original_review_code
        if original_review_function is not None:
            reviewer.review_function = original_review_function


def test_health_check_returns_healthy_status(client):
    """GET /health should return a healthy status response."""
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data == {"status": "healthy", "service": "python-reviewer"}


@pytest.mark.parametrize(
    "request_kwargs",
    [
        {},  # No body
        {"json": {}},  # Empty JSON object
        {"json": {"language": "python"}},  # Missing 'content' key
    ],
)
def test_review_code_missing_content_returns_400(client, reviewer_mocks, request_kwargs):
    """POST /review without required 'content' should return 400."""
    resp = client.post("/review", **request_kwargs)
    assert resp.status_code == 400
    assert resp.get_json() == {"error": "Missing 'content' field"}


def test_review_code_happy_path_defaults_language_python(client, reviewer_mocks):
    """POST /review with content only should default language to 'python' and return formatted result."""
    _, review_code_mock, _ = reviewer_mocks

    mock_result = SimpleNamespace(
        score=95.5,
        issues=[
            SimpleNamespace(
                severity="low",
                line=1,
                message="Minor style issue",
                suggestion="Use snake_case",
            )
        ],
        suggestions=["Consider adding type hints"],
        complexity_score=3.2,
    )
    review_code_mock.return_value = mock_result

    payload = {"content": 'print("hello")'}
    resp = client.post("/review", json=payload)

    assert resp.status_code == 200
    data = resp.get_json()

    # Assert reviewer called with expected defaults
    review_code_mock.assert_called_once_with('print("hello")', "python")

    # Validate response structure and values
    assert data["score"] == pytest.approx(95.5)
    assert data["issues"] == [
        {
            "severity": "low",
            "line": 1,
            "message": "Minor style issue",
            "suggestion": "Use snake_case",
        }
    ]
    assert data["suggestions"] == ["Consider adding type hints"]
    assert data["complexity_score"] == pytest.approx(3.2)


@pytest.mark.parametrize("language", ["python", "javascript", "go"])
def test_review_code_happy_path_with_language_variants(client, reviewer_mocks, language):
    """POST /review with explicit language should pass through to reviewer and return data."""
    _, review_code_mock, _ = reviewer_mocks

    mock_result = SimpleNamespace(
        score=88.0,
        issues=[],
        suggestions=[],
        complexity_score=1.0,
    )
    review_code_mock.return_value = mock_result

    payload = {"content": "code body", "language": language}
    resp = client.post("/review", json=payload)

    assert resp.status_code == 200
    data = resp.get_json()
    review_code_mock.assert_called_once_with("code body", language)

    assert data["score"] == pytest.approx(88.0)
    assert data["issues"] == []
    assert data["suggestions"] == []
    assert data["complexity_score"] == pytest.approx(1.0)


def test_review_code_internal_error_returns_500(client, reviewer_mocks):
    """POST /review should return 500 if reviewer.review_code raises an exception."""
    _, review_code_mock, _ = reviewer_mocks
    review_code_mock.side_effect = RuntimeError("boom")

    resp = client.post("/review", json={"content": "anything"})
    assert resp.status_code == 500  # Flask default for unhandled exceptions


@pytest.mark.parametrize(
    "request_kwargs",
    [
        {},  # No body
        {"json": {}},  # Empty JSON object (missing function_code)
    ],
)
def test_review_function_missing_field_returns_400(client, reviewer_mocks, request_kwargs):
    """POST /review/function without required 'function_code' should return 400."""
    resp = client.post("/review/function", **request_kwargs)
    assert resp.status_code == 400
    assert resp.get_json() == {"error": "Missing 'function_code' field"}


def test_review_function_happy_path_returns_json(client, reviewer_mocks):
    """POST /review/function should return the JSON provided by reviewer."""
    _, _, review_function_mock = reviewer_mocks
    mock_output = {
        "valid": True,
        "metrics": {"cyclomatic": 2.75, "length": 42},
        "notes": ["Looks good"],
    }
    review_function_mock.return_value = mock_output

    payload = {"function_code": "def foo(): pass"}
    resp = client.post("/review/function", json=payload)

    assert resp.status_code == 200
    data = resp.get_json()
    review_function_mock.assert_called_once_with("def foo(): pass")

    # Validate returned JSON, using approx for floats
    assert data["valid"] is True
    assert data["metrics"]["cyclomatic"] == pytest.approx(2.75)
    assert data["metrics"]["length"] == 42
    assert data["notes"] == ["Looks good"]


def test_review_function_internal_error_returns_500(client, reviewer_mocks):
    """POST /review/function should return 500 if reviewer.review_function raises an exception."""
    _, _, review_function_mock = reviewer_mocks
    review_function_mock.side_effect = ValueError("unexpected")

    resp = client.post("/review/function", json={"function_code": "def x(): pass"})
    assert resp.status_code == 500