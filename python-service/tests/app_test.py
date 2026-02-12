import sys
import types
from types import SimpleNamespace
from unittest.mock import Mock

import pytest

# Ensure src.code_reviewer import in src.app doesn't fail if module isn't present
if "src.code_reviewer" not in sys.modules:
    stub_module = types.ModuleType("src.code_reviewer")

    class CodeReviewer:
        def review_code(self, content, language):
            return {}

        def review_function(self, function_code):
            return {}

    stub_module.CodeReviewer = CodeReviewer
    sys.modules["src.code_reviewer"] = stub_module


@pytest.fixture
def client_and_reviewer(monkeypatch):
    """Provide a Flask test client with the app's reviewer mocked."""
    from src.app import app
    reviewer_mock = Mock()
    reviewer_mock.review_code = Mock()
    reviewer_mock.review_function = Mock()
    monkeypatch.setattr("src.app.reviewer", reviewer_mock)
    with app.test_client() as client:
        yield client, reviewer_mock


def test_health_check_ok(client_and_reviewer):
    """Test /health returns expected JSON and 200 status."""
    client, _ = client_and_reviewer
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data == {"status": "healthy", "service": "python-reviewer"}


@pytest.mark.parametrize(
    "use_json,payload",
    [
        (False, None),  # No body
        (True, {}),  # Empty JSON
        (True, {"language": "python"}),  # Missing 'content' key
    ],
)
def test_review_code_missing_content_returns_400(client_and_reviewer, use_json, payload):
    """Test /review returns 400 when 'content' is missing or body is absent."""
    client, reviewer_mock = client_and_reviewer
    if use_json:
        resp = client.post("/review", json=payload)
    else:
        resp = client.post("/review")
    assert resp.status_code == 400
    assert resp.get_json() == {"error": "Missing 'content' field"}
    reviewer_mock.review_code.assert_not_called()


@pytest.mark.parametrize(
    "payload,expected_language",
    [
        ({"content": "print('hello')"}, "python"),  # default language when missing
        ({"content": "console.log('hi')", "language": "javascript"}, "javascript"),
        ({"content": "print('x')", "language": None}, None),  # explicit None is passed through
    ],
)
def test_review_code_success_with_various_languages(client_and_reviewer, payload, expected_language):
    """Test /review success path and verify language handling and response transformation."""
    client, reviewer_mock = client_and_reviewer

    issues = [
        SimpleNamespace(severity="high", line=10, message="Avoid eval", suggestion="Use ast.literal_eval"),
        SimpleNamespace(severity="low", line=2, message="Trailing whitespace", suggestion="Remove trailing space"),
    ]
    result = SimpleNamespace(
        score=92.5,
        issues=issues,
        suggestions=["Use list comprehensions", "Add type hints"],
        complexity_score=3.14159,
    )
    reviewer_mock.review_code.return_value = result

    resp = client.post("/review", json=payload)
    assert resp.status_code == 200
    data = resp.get_json()

    # Verify call and arguments
    reviewer_mock.review_code.assert_called_once_with(payload["content"], expected_language)

    # Verify JSON shape and values
    assert "score" in data
    assert "issues" in data
    assert "suggestions" in data
    assert "complexity_score" in data

    assert data["score"] == pytest.approx(92.5)
    assert data["complexity_score"] == pytest.approx(3.14159)

    expected_issues = [
        {
            "severity": "high",
            "line": 10,
            "message": "Avoid eval",
            "suggestion": "Use ast.literal_eval",
        },
        {
            "severity": "low",
            "line": 2,
            "message": "Trailing whitespace",
            "suggestion": "Remove trailing space",
        },
    ]
    assert data["issues"] == expected_issues
    assert data["suggestions"] == ["Use list comprehensions", "Add type hints"]


@pytest.mark.parametrize(
    "use_json,payload",
    [
        (False, None),  # No body
        (True, {}),  # Empty JSON
        (True, {"code": "def f(): pass"}),  # Missing 'function_code' key
    ],
)
def test_review_function_missing_field_returns_400(client_and_reviewer, use_json, payload):
    """Test /review/function returns 400 when 'function_code' is missing or body is absent."""
    client, reviewer_mock = client_and_reviewer
    if use_json:
        resp = client.post("/review/function", json=payload)
    else:
        resp = client.post("/review/function")
    assert resp.status_code == 400
    assert resp.get_json() == {"error": "Missing 'function_code' field"}
    reviewer_mock.review_function.assert_not_called()


def test_review_function_success(client_and_reviewer):
    """Test /review/function success path returns reviewer's raw result."""
    client, reviewer_mock = client_and_reviewer
    return_payload = {
        "quality": "good",
        "score": 0.88,
        "details": {"lines": 12, "cyclomatic": 3},
    }
    reviewer_mock.review_function.return_value = return_payload

    body = {"function_code": "def foo():\n    return 42\n"}
    resp = client.post("/review/function", json=body)
    assert resp.status_code == 200
    data = resp.get_json()

    reviewer_mock.review_function.assert_called_once_with(body["function_code"])

    assert data["quality"] == "good"
    assert data["score"] == pytest.approx(0.88)
    assert data["details"] == {"lines": 12, "cyclomatic": 3}