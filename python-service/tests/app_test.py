import sys
import types
from types import SimpleNamespace
from unittest.mock import Mock

import pytest


@pytest.fixture
def client_and_reviewer(monkeypatch):
    """
    Provide a Flask test client and a mocked CodeReviewer.

    - Ensures src.code_reviewer exists before importing src.app
    - Imports the Flask app using the required import style
    - Monkeypatches the module-level 'reviewer' with a Mock
    """
    # Ensure the dependency module exists before importing the app
    if "src.code_reviewer" not in sys.modules:
        code_reviewer_module = types.ModuleType("src.code_reviewer")

        class DummyCodeReviewer:
            def review_code(self, *args, **kwargs):
                return None

            def review_function(self, *args, **kwargs):
                return None

        setattr(code_reviewer_module, "CodeReviewer", DummyCodeReviewer)
        sys.modules["src.code_reviewer"] = code_reviewer_module

    from src.app import app as flask_app  # exact import required

    # Patch the module-level reviewer with a Mock
    app_module = sys.modules["src.app"]
    mock_reviewer = Mock()
    monkeypatch.setattr(app_module, "reviewer", mock_reviewer, raising=True)

    flask_app.config["TESTING"] = True
    with flask_app.test_client() as client:
        yield client, mock_reviewer


def test_health_check_returns_ok(client_and_reviewer):
    """Test that /health returns a 200 with expected status and service."""
    client, _ = client_and_reviewer
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "healthy"
    assert data["service"] == "python-reviewer"


def test_review_code_missing_content_returns_400(client_and_reviewer):
    """Test that /review returns 400 when 'content' is missing."""
    client, mock_reviewer = client_and_reviewer
    resp = client.post("/review", json={"language": "python"})
    assert resp.status_code == 400
    assert resp.get_json() == {"error": "Missing 'content' field"}
    mock_reviewer.review_code.assert_not_called()


@pytest.mark.parametrize(
    "payload, expected_language",
    [
        ({"content": "print('hi')"}, "python"),
        ({"content": "console.log('hi')", "language": "javascript"}, "javascript"),
    ],
)
def test_review_code_success_formats_response_and_calls_reviewer(
    client_and_reviewer, payload, expected_language
):
    """Test /review happy path: calls reviewer with correct args and formats response."""
    client, mock_reviewer = client_and_reviewer

    result = SimpleNamespace(
        score=85.5,
        issues=[
            SimpleNamespace(
                severity="high",
                line=10,
                message="Avoid eval()",
                suggestion="Refactor to safer alternatives",
            ),
            SimpleNamespace(
                severity="medium",
                line=20,
                message="Too complex function",
                suggestion="Extract helper functions",
            ),
        ],
        suggestions=["Prefer f-strings", "Add docstrings"],
        complexity_score=3.75,
    )
    mock_reviewer.review_code.return_value = result

    resp = client.post("/review", json=payload)
    assert resp.status_code == 200

    data = resp.get_json()
    assert data["score"] == pytest.approx(85.5)
    assert data["complexity_score"] == pytest.approx(3.75)
    assert data["suggestions"] == ["Prefer f-strings", "Add docstrings"]

    assert isinstance(data["issues"], list)
    assert len(data["issues"]) == 2
    assert data["issues"][0] == {
        "severity": "high",
        "line": 10,
        "message": "Avoid eval()",
        "suggestion": "Refactor to safer alternatives",
    }
    assert data["issues"][1]["severity"] == "medium"
    assert data["issues"][1]["line"] == 20
    assert data["issues"][1]["message"] == "Too complex function"
    assert data["issues"][1]["suggestion"] == "Extract helper functions"

    mock_reviewer.review_code.assert_called_once_with(
        payload.get("content"), expected_language
    )


def test_review_code_allows_none_content_and_passes_through(client_and_reviewer):
    """Test that /review allows None 'content' and passes it to reviewer."""
    client, mock_reviewer = client_and_reviewer

    result = SimpleNamespace(
        score=0.0,
        issues=[],
        suggestions=[],
        complexity_score=0.0,
    )
    mock_reviewer.review_code.return_value = result

    payload = {"content": None, "language": "python"}
    resp = client.post("/review", json=payload)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["score"] == pytest.approx(0.0)
    assert data["complexity_score"] == pytest.approx(0.0)
    assert data["issues"] == []
    assert data["suggestions"] == []

    mock_reviewer.review_code.assert_called_once_with(None, "python")


def test_review_function_missing_field_returns_400(client_and_reviewer):
    """Test that /review/function returns 400 when 'function_code' is missing."""
    client, mock_reviewer = client_and_reviewer
    resp = client.post("/review/function", json={})
    assert resp.status_code == 400
    assert resp.get_json() == {"error": "Missing 'function_code' field"}
    mock_reviewer.review_function.assert_not_called()


def test_review_function_success_returns_reviewer_result(client_and_reviewer):
    """Test that /review/function returns the reviewer's raw result."""
    client, mock_reviewer = client_and_reviewer
    mock_reviewer.review_function.return_value = {
        "ok": True,
        "metrics": {"score": 0.99},
        "details": ["analyzed 1 function"],
    }

    payload = {"function_code": "def foo():\n    return 1\n"}
    resp = client.post("/review/function", json=payload)
    assert resp.status_code == 200

    data = resp.get_json()
    assert data["ok"] is True
    assert data["metrics"]["score"] == pytest.approx(0.99)
    assert data["details"] == ["analyzed 1 function"]

    mock_reviewer.review_function.assert_called_once_with(payload["function_code"])