import sys
import types
from types import SimpleNamespace
from unittest.mock import Mock

import pytest

# Inject a stub for src.code_reviewer before importing src.app
code_reviewer_module = types.ModuleType("src.code_reviewer")


class CodeReviewer:
    def __init__(self, *args, **kwargs):
        pass

    def review_code(self, content, language):
        raise NotImplementedError

    def review_function(self, function_code):
        raise NotImplementedError


code_reviewer_module.CodeReviewer = CodeReviewer
sys.modules.setdefault("src.code_reviewer", code_reviewer_module)

from src.app import app, reviewer  # noqa: E402


@pytest.fixture
def client():
    """Provide a Flask test client."""
    app.testing = True
    with app.test_client() as c:
        yield c


def test_health_check_returns_status_and_service(client):
    """GET /health returns expected status and service."""
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data == {"status": "healthy", "service": "python-reviewer"}


@pytest.mark.parametrize(
    "payload",
    [
        None,
        {},
        {"language": "python"},
        {"something_else": "value"},
    ],
)
def test_review_code_missing_content_returns_400(client, payload):
    """POST /review with missing 'content' field returns 400."""
    resp = client.post("/review", json=payload)
    assert resp.status_code == 400
    data = resp.get_json()
    assert data == {"error": "Missing 'content' field"}


def test_review_code_calls_reviewer_with_defaults_and_returns_mapped_response(client, monkeypatch):
    """POST /review without language uses default 'python' and maps result fields."""
    # Prepare a fake result from reviewer.review_code
    issues = [
        SimpleNamespace(severity="high", line=10, message="I1", suggestion="S1"),
        SimpleNamespace(severity="low", line=20, message="I2", suggestion="S2"),
    ]
    fake_result = SimpleNamespace(
        score=85.5,
        issues=issues,
        suggestions=["Use list comprehension", "Add docstrings"],
        complexity_score=12.34,
    )

    mock_review_code = Mock(return_value=fake_result)
    monkeypatch.setattr(reviewer, "review_code", mock_review_code)

    payload = {"content": ""}  # content present but empty is allowed
    resp = client.post("/review", json=payload)

    assert resp.status_code == 200
    mock_review_code.assert_called_once_with("", "python")

    data = resp.get_json()
    assert set(data.keys()) == {"score", "issues", "suggestions", "complexity_score"}
    assert data["score"] == pytest.approx(85.5)
    assert data["complexity_score"] == pytest.approx(12.34)
    assert data["suggestions"] == ["Use list comprehension", "Add docstrings"]
    assert data["issues"] == [
        {"severity": "high", "line": 10, "message": "I1", "suggestion": "S1"},
        {"severity": "low", "line": 20, "message": "I2", "suggestion": "S2"},
    ]


def test_review_code_with_language_parameter_calls_reviewer_with_language(client, monkeypatch):
    """POST /review passes provided language to reviewer.review_code."""
    fake_result = SimpleNamespace(
        score=100.0,
        issues=[],
        suggestions=[],
        complexity_score=0.0,
    )
    mock_review_code = Mock(return_value=fake_result)
    monkeypatch.setattr(reviewer, "review_code", mock_review_code)

    payload = {"content": "print('hi')", "language": "javascript"}
    resp = client.post("/review", json=payload)

    assert resp.status_code == 200
    mock_review_code.assert_called_once_with("print('hi')", "javascript")
    data = resp.get_json()
    assert data["score"] == pytest.approx(100.0)
    assert data["issues"] == []
    assert data["suggestions"] == []
    assert data["complexity_score"] == pytest.approx(0.0)


@pytest.mark.parametrize(
    "payload",
    [
        None,
        {},
        {"foo": "bar"},
    ],
)
def test_review_function_missing_field_returns_400(client, payload):
    """POST /review/function with missing 'function_code' returns 400."""
    resp = client.post("/review/function", json=payload)
    assert resp.status_code == 400
    data = resp.get_json()
    assert data == {"error": "Missing 'function_code' field"}


def test_review_function_success_passes_code_and_returns_result(client, monkeypatch):
    """POST /review/function forwards 'function_code' to reviewer and returns its result."""
    expected = {"ok": True, "details": {"count": 3}}
    mock_review_function = Mock(return_value=expected)
    monkeypatch.setattr(reviewer, "review_function", mock_review_function)

    func_code = "def foo():\n    return 42\n"
    resp = client.post("/review/function", json={"function_code": func_code})

    assert resp.status_code == 200
    mock_review_function.assert_called_once_with(func_code)
    data = resp.get_json()
    assert data == expected