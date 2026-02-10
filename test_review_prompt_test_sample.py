import sys
import json
import pytest

from review_prompt_test_sample import load_config, process_config


@pytest.fixture(autouse=True)
def attach_real_json_os(monkeypatch):
    """Ensure the module under test has 'json' and 'os' available despite missing imports."""
    module = sys.modules[load_config.__module__]
    import os as real_os
    monkeypatch.setattr(module, "json", json, raising=False)
    monkeypatch.setattr(module, "os", real_os, raising=False)


@pytest.fixture
def write_temp_json(tmp_path):
    """Helper fixture to write a JSON file and return its path as a string."""
    def _write(obj, name="config.json"):
        p = tmp_path / name
        p.write_text(json.dumps(obj), encoding="utf-8")
        return str(p)
    return _write


def test_load_config_reads_json_file(write_temp_json):
    """load_config should read and parse JSON content from the given file path."""
    data = {"a": 1, "b": {"c": 2}}
    path = write_temp_json(data)
    result = load_config(path)
    assert result == data


def test_load_config_raises_file_not_found(tmp_path):
    """load_config should raise FileNotFoundError when file does not exist."""
    missing_path = str(tmp_path / "does_not_exist.json")
    with pytest.raises(FileNotFoundError):
        load_config(missing_path)


def test_process_config_no_env_overrides_returns_raw(write_temp_json, monkeypatch):
    """process_config should return the raw config when APP_OVERRIDES is not set."""
    monkeypatch.delenv("APP_OVERRIDES", raising=False)
    data = {"x": 10, "y": 20}
    path = write_temp_json(data)
    result = process_config(path)
    assert result == data


@pytest.mark.parametrize("env_value", [None, ""])
def test_process_config_env_override_var_absent_or_empty(write_temp_json, monkeypatch, env_value):
    """process_config should ignore APP_OVERRIDES when it is absent or an empty string."""
    if env_value is None:
        monkeypatch.delenv("APP_OVERRIDES", raising=False)
    else:
        monkeypatch.setenv("APP_OVERRIDES", env_value)
    raw = {"alpha": 1, "nested": {"k": "v"}}
    path = write_temp_json(raw)
    result = process_config(path)
    assert result == raw


def test_process_config_with_valid_env_json_overrides(write_temp_json, monkeypatch):
    """process_config should merge in environment overrides using a shallow update."""
    raw = {"a": 1, "nested": {"x": 1}}
    overrides = {"a": 2, "new": 5}
    monkeypatch.setenv("APP_OVERRIDES", json.dumps(overrides))
    path = write_temp_json(raw)
    result = process_config(path)
    assert result["a"] == 2
    assert result["new"] == 5
    assert result["nested"] == {"x": 1}


def test_process_config_override_shallow_merge_replaces_nested_dict(write_temp_json, monkeypatch):
    """process_config should perform a shallow update where nested dicts are replaced."""
    raw = {"nested": {"x": 1, "y": 2}, "keep": True}
    overrides = {"nested": {"z": 3}}
    monkeypatch.setenv("APP_OVERRIDES", json.dumps(overrides))
    path = write_temp_json(raw)
    result = process_config(path)
    assert result["nested"] == {"z": 3}
    assert result["keep"] is True


def test_process_config_invalid_env_json_raises(write_temp_json, monkeypatch):
    """process_config should propagate JSON decoding errors from invalid APP_OVERRIDES."""
    raw = {"a": 1}
    monkeypatch.setenv("APP_OVERRIDES", '{"a": BAD_JSON}')
    path = write_temp_json(raw)
    with pytest.raises(json.JSONDecodeError):
        process_config(path)