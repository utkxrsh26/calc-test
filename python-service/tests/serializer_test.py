import json
from unittest.mock import patch

import pytest
from pydantic import ValidationError

from src.serializer import ReviewPayload, serialize_metadata, serialize_payload


@pytest.fixture
def valid_metadata():
    """Provide a valid metadata dictionary for testing."""
    return {"author": "Alice", "version": "1.0"}


@pytest.fixture
def review_payload_instance(valid_metadata):
    """Create a ReviewPayload instance with valid data."""
    return ReviewPayload(
        file_path="/tmp/file.txt",
        language="python",
        metadata=valid_metadata,
    )


def test_ReviewPayload_initialization_valid(valid_metadata):
    """Test ReviewPayload initialization with valid data."""
    payload = ReviewPayload(
        file_path="path/to/file.py",
        language="python",
        metadata=valid_metadata,
    )
    assert payload.file_path == "path/to/file.py"
    assert payload.language == "python"
    assert payload.metadata == valid_metadata


def test_ReviewPayload_initialization_missing_required_fields():
    """Test ReviewPayload raises ValidationError when required fields are missing."""
    with pytest.raises(ValidationError):
        ReviewPayload()  # type: ignore[arg-type]


def test_ReviewPayload_initialization_invalid_metadata_type():
    """Test ReviewPayload raises ValidationError when metadata is not a dict of str to str."""
    with pytest.raises(ValidationError):
        ReviewPayload(
            file_path="file.py",
            language="python",
            metadata={"key": 123},  # type: ignore[dict-item]
        )


def test_ReviewPayload_initialization_non_string_file_path(valid_metadata):
    """Test ReviewPayload raises ValidationError when file_path is not a string."""
    with pytest.raises(ValidationError):
        ReviewPayload(
            file_path=123,  # type: ignore[arg-type]
            language="python",
            metadata=valid_metadata,
        )


def test_ReviewPayload_initialization_non_string_language(valid_metadata):
    """Test ReviewPayload raises ValidationError when language is not a string."""
    with pytest.raises(ValidationError):
        ReviewPayload(
            file_path="file.py",
            language=123,  # type: ignore[arg-type]
            metadata=valid_metadata,
        )


def test_serialize_metadata_basic(review_payload_instance, valid_metadata):
    """Test serialize_metadata returns correct JSON string for metadata."""
    result = serialize_metadata(review_payload_instance)
    assert json.loads(result) == valid_metadata


def test_serialize_metadata_empty_metadata():
    """Test serialize_metadata with empty metadata dict."""
    payload = ReviewPayload(file_path="file.py", language="python", metadata={})
    result = serialize_metadata(payload)
    assert json.loads(result) == {}


def test_serialize_metadata_with_json_dumps_called(review_payload_instance):
    """Test serialize_metadata uses json.dumps with the payload's metadata."""
    with patch("src.serializer.json.dumps") as mock_dumps:
        mock_dumps.return_value = "{}"
        result = serialize_metadata(review_payload_instance)

        mock_dumps.assert_called_once_with(review_payload_instance.metadata)
        assert result == "{}"


def test_serialize_payload_basic(review_payload_instance, valid_metadata):
    """Test serialize_payload returns correct JSON string for full payload."""
    result = serialize_payload(review_payload_instance)
    parsed = json.loads(result)
    assert parsed["file_path"] == "/tmp/file.txt"
    assert parsed["language"] == "python"
    assert parsed["metadata"] == valid_metadata


def test_serialize_payload_with_empty_metadata():
    """Test serialize_payload handles empty metadata correctly."""
    payload = ReviewPayload(file_path="file.py", language="python", metadata={})
    result = serialize_payload(payload)
    parsed = json.loads(result)
    assert parsed == {
        "file_path": "file.py",
        "language": "python",
        "metadata": {},
    }


def test_serialize_payload_with_special_characters_in_metadata():
    """Test serialize_payload correctly serializes metadata with special characters."""
    metadata = {
        "newline": "line1\nline2",
        "quote": 'He said "hello"',
        "unicode": " café ",
    }
    payload = ReviewPayload(file_path="file.py", language="python", metadata=metadata)

    result = serialize_payload(payload)
    parsed = json.loads(result)
    assert parsed["metadata"] == metadata


def test_serialize_payload_json_dumps_called_with_expected_dict(review_payload_instance):
    """Test serialize_payload uses json.dumps with the correct dictionary structure."""
    expected_dict = {
        "file_path": review_payload_instance.file_path,
        "language": review_payload_instance.language,
        "metadata": review_payload_instance.metadata,
    }

    with patch("src.serializer.json.dumps") as mock_dumps:
        mock_dumps.return_value = "{}"
        result = serialize_payload(review_payload_instance)

        mock_dumps.assert_called_once_with(expected_dict)
        assert result == "{}"