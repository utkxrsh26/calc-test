import json
from pathlib import Path
from unittest.mock import patch

import pytest

from review_prompt_test_sample import load_config, process_config


@pytest.fixture
def base_config():
    return {"x": 1, "y": "z"}


@pytest.fixture
def config_file(tmp_path: Path, base_config: dict) -> Path:
    """Create a temporary JSON config file and return its path."""
    path = tmp_path / "config.json"
    path.write_text(json.dumps(base_config), encoding="utf-8")
    return path


def test_load_config_reads_valid_json(config_file: Path, base_config: dict):
    """load_config should read and parse valid JSON files correctly."""
    result = load_config(str(config_file))
    assert result == base_config


def test_load_config_raises_on_invalid_json(tmp_path: Path):
    """load_config should raise JSONDecodeError for invalid JSON."""
    bad_path = tmp_path / "bad.json"
    bad_path.write_text('{"a": 1,}', encoding="utf-8")  # trailing comma -> invalid JSON
    with pytest.raises(json.JSONDecodeError):
        load_config(str(bad_path))


def test_load_config_raises_on_missing_file(tmp_path: Path):
    """load_config should raise FileNotFoundError when the file does not exist."""
    missing_path = tmp_path / "missing.json"
    with pytest.raises(FileNotFoundError):
        load_config(str(missing_path))


@pytest.mark.parametrize(
    "env_value,expected_update",
    [
        (None, {}),
        ('{"z": 9}', {"z": 9}),
        ('{"x": 123}', {"x": 123}),  # override existing key
        ('{}', {}),  # no-op override
    ],
)
def test_process_config_applies_env_overrides(monkeypatch, config_file: Path, base_config: dict, env_value, expected_update):
    """process_config should merge APP_OVERRIDES JSON from env into the loaded config."""
    if env_value is None:
        monkeypatch.delenv("APP_OVERRIDES", raising=False)
    else:
        monkeypatch.setenv("APP_OVERRIDES", env_value)

    result = process_config(str(config_file))
    expected = dict(base_config)
    expected.update(expected_update)
    assert result == expected


def test_process_config_uses_load_config_and_env_overrides_mocked():
    """process_config should call load_config and update with env overrides; result is the same dict object."""
    with patch("review_prompt_test_sample.load_config", return_value={"a": 1}) as mock_lc, patch.dict(
        "review_prompt_test_sample.os.environ",
        {"APP_OVERRIDES": '{"b": 2}'},
        clear=False,
    ):
        result = process_config("dummy/path.json")
        # Should have merged overrides
        assert result == {"a": 1, "b": 2}
        # Should have called load_config with the provided path
        mock_lc.assert_called_once_with("dummy/path.json")
        # Should return the same object that load_config returned (in-place update)
        assert result is mock_lc.return_value


def test_process_config_raises_on_invalid_env_override_json(config_file: Path, monkeypatch):
    """process_config should propagate JSONDecodeError if APP_OVERRIDES contains invalid JSON."""
    monkeypatch.setenv("APP_OVERRIDES", "{not valid json")
    with pytest.raises(json.JSONDecodeError):
        process_config(str(config_file))