import sys
import types
import importlib
from types import SimpleNamespace

import pytest

# Prepare a fake src.code_reviewer module before importing src.app
# so that "from src.code_reviewer import CodeReviewer" succeeds.
src_pkg = types.ModuleType("src")
sys.modules.setdefault("src", src_pkg)

fake_code_reviewer = types.ModuleType("src.code_reviewer")


class DummyCodeReviewer:
    def __init__(self, *args, **kwargs):
        pass


fake_code_reviewer.CodeReviewer = DummyCodeReviewer
setattr(src_pkg, "code_reviewer", fake_code_reviewer)
sys.modules["src.code_reviewer"] = fake_code_reviewer

from src.app import app as flask_app  # noqa: E402


@pytest.fixture
def client():
    """Provide a Flask test client."""
    with flask_app.test_client() as c:
        yield c


@pytest.fixture
def mock_reviewer(monkeypatch):
    """Mock the reviewer dependency in src.app."""
    app_module = importlib.import_module("src.app")
    mock = pytest.importorskip("unittest.mock").Mock()
    monkeypatch.setattr(app_module, "reviewer", mock)
    return mock


def test_health_check_returns_expected_json(client):
    """Test /health endpoint returns service status JSON."""
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data == {"status": "healthy", "service": "python-reviewer"}


@pytest.mark.parametrize(
    "case, request_params",
    [
        ("no_json", {}),
        ("empty_json", {"json": {}}),
    ],
)
def test_review_code_missing_content_returns_400(client, case, request_params):
    """Test /review endpoint returns 400 when 'content' is missing or body is empty."""
    resp = client.post("/review", **request_params)
    assert resp.status_code == 400
    data = resp.get_json()
    assert data == {"error": "Missing 'content' field"}


@pytest.mark.parametrize(
    "payload, expected_language",
    [
        ({"content": "print('hi')"}, "python"),
        ({"content": "console.log('hi')", "language": "javascript"}, "javascript"),
    ],
)
def test_review_code_success_builds_expected_response(client, mock_reviewer, payload, expected_language):
    """Test /review endpoint processes valid input and formats response correctly."""
    # Arrange: prepare mock return value
    review_result = SimpleNamespace(
        score=90,
        issues=[
            SimpleNamespace(severity="low", line=1, message="unused variable", suggestion="remove variable"),
            SimpleNamespace(severity="high", line=5, message="possible bug", suggestion="add check"),
        ],
        suggestions=["refactor function", "add tests"],
        complexity_score=3.14159,
    )
    mock_reviewer.review_code.return_value = review_result

    # Act
    resp = client.post("/review", json=payload)

    # Assert status and payload structure
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["score"] == 90
    assert data["issues"] == [
        {"severity": "low", "line": 1, "message": "unused variable", "suggestion": "remove variable"},
        {"severity": "high", "line": 5, "message": "possible bug", "suggestion": "add check"},
    ]
    assert data["suggestions"] == ["refactor function", "add tests"]
    # Use approx for float comparison
    assert data["complexity_score"] == pytest.approx(3.14159, rel=1e-9)

    # Assert reviewer called with correct arguments
    mock_reviewer.review_code.assert_called_once_with(payload["content"], expected_language)


@pytest.mark.parametrize(
    "case, request_params",
    [
        ("no_json", {}),
        ("empty_json", {"json": {}}),
    ],
)
def test_review_function_missing_function_code_returns_400(client, case, request_params):
    """Test /review/function endpoint returns 400 when 'function_code' is missing."""
    resp = client.post("/review/function", **request_params)
    assert resp.status_code == 400
    data = resp.get_json()
    assert data == {"error": "Missing 'function_code' field"}


def test_review_function_success_returns_reviewer_result(client, mock_reviewer):
    """Test /review/function endpoint returns the raw result from reviewer."""
    expected = {"ok": True, "details": {"name": "foo", "lines": 10}}
    mock_reviewer.review_function.return_value = expected

    payload = {"function_code": "def foo():\n    return 42\n"}
    resp = client.post("/review/function", json=payload)

    assert resp.status_code == 200
    data = resp.get_json()
    assert data == expected
    mock_reviewer.review_function.assert_called_once_with(payload["function_code"])