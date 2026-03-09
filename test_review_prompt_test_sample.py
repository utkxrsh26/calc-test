import json
import os
from unittest.mock import Mock, patch, mock_open

import pytest

import review_prompt_test_sample as module_under_test
from review_prompt_test_sample import load_config, process_config


@pytest.fixture
def ensure_stdlib_imports(monkeypatch):
    """Ensure missing imports in the module under test are provided from stdlib."""
    monkeypatch.setattr(module_under_test, "json", json, raising=False)
    monkeypatch.setattr(module_under_test, "os", os, raising=False)
    return module_under_test


@pytest.fixture
def tmp_json_file(tmp_path, ensure_stdlib_imports):
    """Create a temporary JSON file and return its path and content."""
    data = {"name": "app", "version": 1, "nested": {"a": True}}
    p = tmp_path / "config.json"
    p.write_text(json.dumps(data), encoding="utf-8")
    return p, data


def test_load_config_reads_and_parses_json_file(tmp_json_file, ensure_stdlib_imports):
    """load_config should open the given file path and parse it as JSON."""
    p, data = tmp_json_file
    result = load_config(str(p))
    assert result == data


def test_load_config_uses_open_and_json_load(monkeypatch):
    """load_config should call open(path, 'r') and pass the file object to json.load."""
    # Mock json.load to return sentinel
    sentinel = {"ok": True}
    json_mock = Mock()
    json_mock.load.return_value = sentinel
    monkeypatch.setattr(module_under_test, "json", json_mock, raising=True)

    m = mock_open(read_data='{"ignored": true}')
    with patch("builtins.open", m):
        result = load_config("cfg.json")

    # Ensure open called correctly
    m.assert_called_once_with("cfg.json", "r")
    # Ensure json.load called with the file handle from context manager
    file_handle = m.return_value.__enter__.return_value
    json_mock.load.assert_called_once_with(file_handle)
    assert result == sentinel


def test_load_config_file_not_found_raises(ensure_stdlib_imports, tmp_path):
    """load_config should propagate FileNotFoundError when the file does not exist."""
    missing = tmp_path / "missing.json"
    with pytest.raises(FileNotFoundError):
        load_config(str(missing))


def test_process_config_returns_base_when_no_env_overrides(monkeypatch, ensure_stdlib_imports):
    """process_config should return the base config unchanged when APP_OVERRIDES is not set."""
    base_cfg = {"a": 1, "b": 2}
    monkeypatch.setattr(module_under_test, "load_config", lambda p: base_cfg, raising=True)
    monkeypatch.delenv("APP_OVERRIDES", raising=False)

    result = process_config("any-path.json")
    assert result is base_cfg
    assert result == {"a": 1, "b": 2}


def test_process_config_env_empty_string_no_override(monkeypatch, ensure_stdlib_imports):
    """process_config should ignore empty APP_OVERRIDES string and not call json.loads."""
    base_cfg = {"a": 1}
    monkeypatch.setattr(module_under_test, "load_config", lambda p: base_cfg, raising=True)

    # Provide json mock to ensure loads is not called
    json_mock = Mock()
    monkeypatch.setattr(module_under_test, "json", json_mock, raising=True)

    monkeypatch.setenv("APP_OVERRIDES", "")

    result = process_config("cfg.json")
    assert result is base_cfg
    assert json_mock.loads.call_count == 0


@pytest.mark.parametrize("env_value, expected", [
    ({"b": 2, "c": 3}, {"a": 1, "b": 2, "c": 3}),           # override replaces 'b' entirely, adds 'c'
    ({}, {"a": 1, "b": {"x": 1}}),                           # empty override => unchanged
])
def test_process_config_applies_overrides_from_env(monkeypatch, ensure_stdlib_imports, env_value, expected):
    """process_config should shallow-merge overrides from APP_OVERRIDES JSON into the loaded config."""
    base_cfg = {"a": 1, "b": {"x": 1}}
    monkeypatch.setattr(module_under_test, "load_config", lambda p: base_cfg, raising=True)

    monkeypatch.setenv("APP_OVERRIDES", json.dumps(env_value))

    result = process_config("cfg.json")
    # Shallow update modifies in place and returns the same dict instance
    assert result is base_cfg
    assert result == expected


def test_process_config_invalid_overrides_raises_json_error(monkeypatch, ensure_stdlib_imports):
    """process_config should raise JSONDecodeError if APP_OVERRIDES contains invalid JSON."""
    base_cfg = {"a": 1}
    monkeypatch.setattr(module_under_test, "load_config", lambda p: base_cfg, raising=True)

    monkeypatch.setenv("APP_OVERRIDES", "not valid json")

    with pytest.raises(json.JSONDecodeError):
        process_config("cfg.json")


def test_process_config_propagates_load_config_exception(monkeypatch, ensure_stdlib_imports):
    """process_config should propagate exceptions raised by load_config."""
    def _raise(_):
        raise FileNotFoundError("boom")

    monkeypatch.setattr(module_under_test, "load_config", _raise, raising=True)
    monkeypatch.delenv("APP_OVERRIDES", raising=False)

    with pytest.raises(FileNotFoundError):
        process_config("missing.json")