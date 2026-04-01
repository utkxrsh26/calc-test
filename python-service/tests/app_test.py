import pytest
from unittest.mock import MagicMock, patch

from src.app import app, reviewer


@pytest.fixture
def client():
    """Fixture to provide Flask test client."""
    with app.test_client() as client:
        yield client


def test_health_check_returns_healthy_status(client):
    """Test /health endpoint returns healthy status and correct JSON."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.get_json()
    assert data == {"status": "healthy", "service": "python-reviewer"}


@pytest.mark.parametrize(
    "payload, expected_status, expected_error",
    [
        (None, 400, "Missing 'content' field"),
        ({}, 400, "Missing 'content' field"),
        ({"language": "python"}, 400, "Missing 'content' field"),
    ],
)
def test_review_code_missing_content_field(client, payload, expected_status, expected_error):
    """Test /review endpoint returns 400 when 'content' field is missing or payload is invalid."""
    response = client.post("/review", json=payload)
    assert response.status_code == expected_status
    data = response.get_json()
    assert data["error"] == expected_error


def test_review_code_happy_path_with_defaults(client):
    """Test /review endpoint with valid payload and default language."""
    mock_result = MagicMock()
    mock_issue_1 = MagicMock()
    mock_issue_1.severity = "high"
    mock_issue_1.line = 1
    mock_issue_1.message = "Issue 1"
    mock_issue_1.suggestion = "Fix 1"

    mock_issue_2 = MagicMock()
    mock_issue_2.severity = "low"
    mock_issue_2.line = 2
    mock_issue_2.message = "Issue 2"
    mock_issue_2.suggestion = "Fix 2"

    mock_result.score = 85.5
    mock_result.issues = [mock_issue_1, mock_issue_2]
    mock_result.suggestions = ["Suggestion A", "Suggestion B"]
    mock_result.complexity_score = 3.75

    with patch.object(reviewer, "review_code", return_value=mock_result) as mock_review:
        payload = {"content": "print('hello world')"}
        response = client.post("/review", json=payload)

    mock_review.assert_called_once_with("print('hello world')", "python")

    assert response.status_code == 200
    data = response.get_json()
    assert data["score"] == pytest.approx(85.5)
    assert data["complexity_score"] == pytest.approx(3.75)
    assert data["suggestions"] == ["Suggestion A", "Suggestion B"]
    assert isinstance(data["issues"], list)
    assert len(data["issues"]) == 2

    issue1 = data["issues"][0]
    issue2 = data["issues"][1]

    assert issue1 == {
        "severity": "high",
        "line": 1,
        "message": "Issue 1",
        "suggestion": "Fix 1",
    }
    assert issue2 == {
        "severity": "low",
        "line": 2,
        "message": "Issue 2",
        "suggestion": "Fix 2",
    }


def test_review_code_happy_path_with_language(client):
    """Test /review endpoint passes explicit language to reviewer."""
    mock_result = MagicMock()
    mock_result.score = 100.0
    mock_result.issues = []
    mock_result.suggestions = []
    mock_result.complexity_score = 1.0

    with patch.object(reviewer, "review_code", return_value=mock_result) as mock_review:
        payload = {"content": "console.log('hello');", "language": "javascript"}
        response = client.post("/review", json=payload)

    mock_review.assert_called_once_with("console.log('hello');", "javascript")

    assert response.status_code == 200
    data = response.get_json()
    assert data["score"] == pytest.approx(100.0)
    assert data["complexity_score"] == pytest.approx(1.0)
    assert data["issues"] == []
    assert data["suggestions"] == []


@pytest.mark.parametrize(
    "payload, expected_status, expected_error",
    [
        (None, 400, "Missing 'function_code' field"),
        ({}, 400, "Missing 'function_code' field"),
        ({"other_field": "def foo(): pass"}, 400, "Missing 'function_code' field"),
    ],
)
def test_review_function_missing_function_code_field(client, payload, expected_status, expected_error):
    """Test /review/function endpoint returns 400 when 'function_code' field is missing or payload is invalid."""
    response = client.post("/review/function", json=payload)
    assert response.status_code == expected_status
    data = response.get_json()
    assert data["error"] == expected_error


def test_review_function_happy_path(client):
    """Test /review/function endpoint with valid function_code payload."""
    mock_response = {
        "score": 90,
        "issues": [
            {"severity": "medium", "line": 3, "message": "Example", "suggestion": "Do something"}
        ],
        "extra": "value",
    }

    with patch.object(reviewer, "review_function", return_value=mock_response) as mock_review:
        payload = {"function_code": "def foo():\n    return 1"}
        response = client.post("/review/function", json=payload)

    mock_review.assert_called_once_with("def foo():\n    return 1")

    assert response.status_code == 200
    data = response.get_json()
    assert data == mock_response


def test_review_code_uses_empty_string_defaults_when_keys_present_but_none(client):
    """Test /review treats None content as empty string when key exists."""
    mock_result = MagicMock()
    mock_result.score = 0.0
    mock_result.issues = []
    mock_result.suggestions = []
    mock_result.complexity_score = 0.0

    with patch.object(reviewer, "review_code", return_value=mock_result) as mock_review:
        payload = {"content": None, "language": None}
        response = client.post("/review", json=payload)

    # content and language are fetched via data.get with defaults
    mock_review.assert_called_once_with("", "python")

    assert response.status_code == 200
    data = response.get_json()
    assert data["score"] == pytest.approx(0.0)
    assert data["complexity_score"] == pytest.approx(0.0)


def test_review_function_uses_empty_string_default_when_key_present_but_none(client):
    """Test /review/function treats None function_code as empty string when key exists."""
    with patch.object(reviewer, "review_function", return_value={"result": "ok"}) as mock_review:
        payload = {"function_code": None}
        response = client.post("/review/function", json=payload)

    mock_review.assert_called_once_with("")

    assert response.status_code == 200
    data = response.get_json()
    assert data == {"result": "ok"}