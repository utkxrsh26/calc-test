import logging
from unittest.mock import patch

import pytest

from src.config_parser import get_service_url, load_service_config


@pytest.fixture
def config_with_all_services():
    """Fixture providing a config dict with all expected service URLs."""
    return {
        "go_parser_url": "http://go-parser.local",
        "python_reviewer_url": "http://python-reviewer.local",
        "ruby_gateway_url": "http://ruby-gateway.local",
    }


@pytest.fixture
def config_with_partial_services():
    """Fixture providing a config dict with only some service URLs."""
    return {
        "go_parser_url": "http://go-parser.local",
        "python_reviewer_url": "http://python-reviewer.local",
        # ruby_gateway_url intentionally missing
    }


@pytest.mark.parametrize(
    "service_name,key,url",
    [
        ("go_parser", "go_parser_url", "http://go-parser.local"),
        ("python_reviewer", "python_reviewer_url", "http://python-reviewer.local"),
        ("ruby_gateway", "ruby_gateway_url", "http://ruby-gateway.local"),
    ],
)
def test_get_service_url_when_key_exists(config_with_all_services, service_name, key, url):
    """Test get_service_url returns the correct URL when the key exists in config."""
    result = get_service_url(config_with_all_services, service_name)
    assert result == url


@pytest.mark.parametrize(
    "service_name,missing_key",
    [
        ("go_parser", "go_parser_url"),
        ("python_reviewer", "python_reviewer_url"),
        ("ruby_gateway", "ruby_gateway_url"),
    ],
)
def test_get_service_url_when_key_missing_logs_error_and_returns_none(service_name, missing_key):
    """Test get_service_url returns None and logs an error when the key is missing."""
    config = {}  # empty config so key is always missing

    with patch("src.config_parser.logger") as mock_logger:
        result = get_service_url(config, service_name)

    assert result is None
    mock_logger.error.assert_called_once()
    # Ensure the error log message references the service name
    logged_args, logged_kwargs = mock_logger.error.call_args
    assert service_name in logged_args[1]


def test_get_service_url_does_not_log_error_when_key_present(config_with_all_services):
    """Test get_service_url does not log an error when the key exists."""
    with patch("src.config_parser.logger") as mock_logger:
        result = get_service_url(config_with_all_services, "go_parser")

    assert result == "http://go-parser.local"
    mock_logger.error.assert_not_called()


def test_load_service_config_with_all_services_present(config_with_all_services):
    """Test load_service_config returns all URLs when all keys are present."""
    result = load_service_config(config_with_all_services)

    assert result == {
        "go_parser": "http://go-parser.local",
        "python_reviewer": "http://python-reviewer.local",
        "ruby_gateway": "http://ruby-gateway.local",
    }


def test_load_service_config_with_missing_services(config_with_partial_services):
    """Test load_service_config returns None for services whose URLs are missing."""
    result = load_service_config(config_with_partial_services)

    assert result["go_parser"] == "http://go-parser.local"
    assert result["python_reviewer"] == "http://python-reviewer.local"
    assert result["ruby_gateway"] is None


def test_load_service_config_invokes_get_service_url_for_each_service(config_with_all_services):
    """Test load_service_config calls get_service_url once per known service."""
    with patch("src.config_parser.get_service_url") as mock_get_service_url:
        mock_get_service_url.side_effect = [
            "go-url",
            "py-url",
            "rb-url",
        ]
        result = load_service_config(config_with_all_services)

    assert mock_get_service_url.call_count == 3
    mock_get_service_url.assert_any_call(config_with_all_services, "go_parser")
    mock_get_service_url.assert_any_call(config_with_all_services, "python_reviewer")
    mock_get_service_url.assert_any_call(config_with_all_services, "ruby_gateway")
    assert result == {
        "go_parser": "go-url",
        "python_reviewer": "py-url",
        "ruby_gateway": "rb-url",
    }


def test_load_service_config_logs_errors_from_get_service_url():
    """Test load_service_config propagates None values when get_service_url logs errors."""
    raw_config = {}  # all keys missing

    with patch("src.config_parser.logger") as mock_logger:
        result = load_service_config(raw_config)

    assert result == {
        "go_parser": None,
        "python_reviewer": None,
        "ruby_gateway": None,
    }
    # There should be three error logs, one per service
    assert mock_logger.error.call_count == 3
    logged_service_names = [call.args[1] for call in mock_logger.error.call_args_list]
    assert "go_parser" in logged_service_names
    assert "python_reviewer" in logged_service_names
    assert "ruby_gateway" in logged_service_names


def test_get_service_url_works_with_non_string_values():
    """Test get_service_url can return non-string values stored under the URL key."""
    # Even though the type hints say Dict[str, str], Python will allow any value.
    config = {"go_parser_url": 123}
    result = get_service_url(config, "go_parser")
    assert result == 123