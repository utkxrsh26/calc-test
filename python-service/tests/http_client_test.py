import pytest
from unittest.mock import Mock, patch

from src.http_client import ServiceClient


@pytest.fixture
def base_url():
    """Provide a base URL for ServiceClient tests."""
    return "http://example.com/"


@pytest.fixture
def service_client(base_url):
    """Create a ServiceClient instance with a mocked session."""
    client = ServiceClient(base_url=base_url)
    client._session = Mock()
    return client


def test_serviceclient_init_trims_trailing_slash():
    """Test ServiceClient initialization trims trailing slash from base_url."""
    client = ServiceClient("http://example.com///")
    assert client.base_url == "http://example.com"
    assert isinstance(client._session, type(client._session))


def test_serviceclient_init_no_trailing_slash():
    """Test ServiceClient initialization keeps base_url without trailing slash."""
    client = ServiceClient("http://example.com")
    assert client.base_url == "http://example.com"


def test_serviceclient_health_check_success(service_client):
    """Test health_check returns True when status code is 200."""
    mock_response = Mock()
    mock_response.status_code = 200
    service_client._session.get.return_value = mock_response

    result = service_client.health_check()

    service_client._session.get.assert_called_once_with(
        f"{service_client.base_url}/health", timeout=ServiceClient.base_timeout
    )
    assert result is True


def test_serviceclient_health_check_non_200(service_client):
    """Test health_check returns False when status code is not 200."""
    mock_response = Mock()
    mock_response.status_code = 500
    service_client._session.get.return_value = mock_response

    result = service_client.health_check()

    assert result is False


def test_serviceclient_health_check_request_exception(service_client):
    """Test health_check returns False when a RequestException is raised."""
    import requests

    service_client._session.get.side_effect = requests.RequestException("error")

    result = service_client.health_check()

    assert result is False


def test_serviceclient_post_success(service_client):
    """Test post returns JSON data on successful request."""
    mock_response = Mock()
    mock_response.raise_for_status.return_value = None
    expected_json = {"key": "value"}
    mock_response.json.return_value = expected_json
    service_client._session.post.return_value = mock_response

    payload = {"foo": "bar"}
    result = service_client.post("/endpoint", payload)

    service_client._session.post.assert_called_once_with(
        f"{service_client.base_url}/endpoint",
        json=payload,
        timeout=ServiceClient.base_timeout,
    )
    assert result == expected_json


def test_serviceclient_post_strips_leading_slash(service_client):
    """Test post correctly joins base_url and endpoint with leading slash."""
    mock_response = Mock()
    mock_response.raise_for_status.return_value = None
    expected_json = {"another": "value"}
    mock_response.json.return_value = expected_json
    service_client._session.post.return_value = mock_response

    payload = {}
    result = service_client.post("///endpoint", payload)

    service_client._session.post.assert_called_once_with(
        f"{service_client.base_url}/endpoint",
        json=payload,
        timeout=ServiceClient.base_timeout,
    )
    assert result == expected_json


def test_serviceclient_post_request_exception_logs_and_returns_none(service_client, caplog):
    """Test post logs error and returns None on RequestException."""
    import requests

    service_client._session.post.side_effect = requests.RequestException("boom")

    with caplog.at_level("ERROR"):
        result = service_client.post("endpoint", {"foo": "bar"})

    assert result is None
    assert any("POST" in rec.getMessage() for rec in caplog.records)


def test_serviceclient_fetch_success_first_try(service_client):
    """Test fetch returns JSON immediately on first successful attempt."""
    mock_response = Mock()
    mock_response.raise_for_status.return_value = None
    expected_json = {"data": 123}
    mock_response.json.return_value = expected_json
    service_client._session.get.return_value = mock_response

    result = service_client.fetch("/resource")

    service_client._session.get.assert_called_once_with(
        f"{service_client.base_url}/resource",
        timeout=ServiceClient.base_timeout,
    )
    assert result == expected_json


def test_serviceclient_fetch_strips_leading_slash(service_client):
    """Test fetch correctly strips leading slashes from endpoint."""
    mock_response = Mock()
    mock_response.raise_for_status.return_value = None
    expected_json = {"data": "ok"}
    mock_response.json.return_value = expected_json
    service_client._session.get.return_value = mock_response

    result = service_client.fetch("///resource")

    service_client._session.get.assert_called_once_with(
        f"{service_client.base_url}/resource",
        timeout=ServiceClient.base_timeout,
    )
    assert result == expected_json


def test_serviceclient_fetch_retries_on_connection_error_then_succeeds(service_client):
    """Test fetch retries on ConnectionError and eventually succeeds."""
    import requests

    mock_response = Mock()
    mock_response.raise_for_status.return_value = None
    expected_json = {"retried": True}
    mock_response.json.return_value = expected_json

    service_client._session.get.side_effect = [
        requests.ConnectionError("conn1"),
        requests.ConnectionError("conn2"),
        mock_response,
    ]

    with patch("src.http_client.time.sleep") as mock_sleep:
        result = service_client.fetch("resource")

    assert result == expected_json
    assert service_client._session.get.call_count == 3
    mock_sleep.assert_called_with(1)


def test_serviceclient_fetch_raises_after_max_retries(service_client):
    """Test fetch raises ConnectionError after exhausting max_retries."""
    import requests

    service_client._session.get.side_effect = requests.ConnectionError("conn")

    with patch("src.http_client.time.sleep") as mock_sleep:
        with pytest.raises(requests.ConnectionError):
            service_client.fetch("resource")

    assert service_client._session.get.call_count == ServiceClient.max_retries
    # sleep should have been called max_retries - 1 times
    assert mock_sleep.call_count == ServiceClient.max_retries - 1


def test_serviceclient_fetch_no_return_on_pure_connection_errors(service_client):
    """Test fetch has no explicit return when only ConnectionError is raised."""
    import requests

    # This confirms behavior: final attempt raises, so caller must handle exception.
    service_client._session.get.side_effect = requests.ConnectionError("conn")

    with patch("src.http_client.time.sleep"):
        with pytest.raises(requests.ConnectionError):
            _ = service_client.fetch("/resource")


def test_serviceclient_close_closes_session(service_client):
    """Test close calls the underlying session's close method."""
    service_client._session.close = Mock()

    service_client.close()

    service_client._session.close.assert_called_once()