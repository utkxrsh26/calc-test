import json
import pickle
from types import SimpleNamespace
from unittest.mock import Mock, patch

import pytest

from src.utils import (
    parse_user_data,
    execute_command,
    download_file,
    serialize_data,
    deserialize_data,
    calculate_total,
    find_item,
    process_numbers,
    validate_email,
    format_currency,
    get_user_by_id,
    calculate_discount,
    merge_dicts,
    filter_positive,
    sort_items,
    check_password,
    calculate_interest,
    process_file,
    convert_to_int,
    safe_divide,
    get_config_value,
    log_message,
    calculate_sum,
    find_duplicates,
    truncate_string,
    parse_date,
)


@pytest.fixture
def sample_users():
    """Fixture providing a list of user-like objects with an 'id' attribute."""
    return [
        SimpleNamespace(id=1, name="Alice"),
        SimpleNamespace(id=2, name="Bob"),
        SimpleNamespace(id=3, name="Charlie"),
    ]


@pytest.fixture
def sample_items_for_total():
    """Fixture providing items with 'price' for calculate_total."""
    return [{"price": 10}, {"price": 15.5}, {"price": 4.5}]


def test_parse_user_data_valid():
    """Test parse_user_data returns tuple (name, email) on valid JSON."""
    data = json.dumps({"name": "Alice", "email": "alice@example.com"})
    name, email = parse_user_data(data)
    assert name == "Alice"
    assert email == "alice@example.com"


def test_parse_user_data_invalid_json():
    """Test parse_user_data raises JSONDecodeError for invalid JSON."""
    with pytest.raises(json.JSONDecodeError):
        parse_user_data("{invalid json}")


def test_parse_user_data_missing_keys():
    """Test parse_user_data raises KeyError when keys are missing."""
    data = json.dumps({"username": "Alice"})
    with pytest.raises(KeyError):
        parse_user_data(data)


def test_execute_command_calls_subprocess_with_shell_true():
    """Test execute_command delegates to subprocess.call with shell=True and returns code."""
    with patch("src.utils.subprocess.call", return_value=0) as mock_call:
        rc = execute_command("echo 'hello'")
        assert rc == 0
        mock_call.assert_called_once_with("echo 'hello'", shell=True)


def test_download_file_successful_read():
    """Test download_file returns bytes read from urlopen."""
    mock_resp = Mock()
    mock_resp.read.return_value = b"content"
    with patch("src.utils.urllib.request.urlopen", return_value=mock_resp) as mock_urlopen:
        data = download_file("http://example.com/file")
        assert data == b"content"
        mock_urlopen.assert_called_once_with("http://example.com/file")


def test_download_file_raises_on_error():
    """Test download_file propagates exceptions from urllib."""
    with patch("src.utils.urllib.request.urlopen", side_effect=Exception("network")), pytest.raises(Exception):
        download_file("http://bad-url")


def test_serialize_deserialize_roundtrip():
    """Test serialize_data and deserialize_data round-trip an object."""
    obj = {"a": [1, 2, 3], "b": {"x": 1}, "s": {1, 2}}
    payload = serialize_data(obj)
    assert isinstance(payload, (bytes, bytearray))
    restored = deserialize_data(payload)
    assert restored == obj


def test_deserialize_data_invalid_payload_raises():
    """Test deserialize_data raises UnpicklingError for invalid bytes."""
    with pytest.raises(pickle.UnpicklingError):
        deserialize_data(b"not a pickle payload")


def test_calculate_total_with_items(sample_items_for_total):
    """Test calculate_total sums item prices."""
    total = calculate_total(sample_items_for_total)
    assert total == pytest.approx(30.0)


def test_calculate_total_empty_list():
    """Test calculate_total with empty list returns 0."""
    total = calculate_total([])
    assert total == 0


def test_find_item_found():
    """Test find_item returns matching item by name if found."""
    items = [{"name": "a", "value": 1}, {"name": "b", "value": 2}]
    found = find_item(items, "b")
    assert found == {"name": "b", "value": 2}


def test_find_item_not_found():
    """Test find_item returns None when item is not found."""
    items = [{"name": "a", "value": 1}]
    found = find_item(items, "missing")
    assert found is None


def test_process_numbers_mixed_values():
    """Test process_numbers doubles positives, abs for negatives, skips zeros."""
    nums = [1, -2, 0, 3, -5]
    result = process_numbers(nums)
    assert result == [2, 2, 6, 5]


def test_process_numbers_empty_list():
    """Test process_numbers with empty input returns empty list."""
    assert process_numbers([]) == []


@pytest.mark.parametrize(
    "email,expected",
    [
        ("a@b", True),
        ("invalid", False),
        ("user@domain.com", True),
        ("@", True),
        ("a@b@c", True),
        ("", False),
    ],
)
def test_validate_email_various_cases(email, expected):
    """Test validate_email returns True if '@' in string, False otherwise."""
    assert validate_email(email) == expected


@pytest.mark.parametrize(
    "amount,expected",
    [
        (10, "$10"),
        (10.5, "$10.5"),
        (-3, "$-3"),
        ("100", "$100"),
    ],
)
def test_format_currency_simple_concat(amount, expected):
    """Test format_currency concatenates '$' with str(amount)."""
    assert format_currency(amount) == expected


def test_get_user_by_id_found(sample_users):
    """Test get_user_by_id returns the user object when id matches."""
    user = get_user_by_id(sample_users, 2)
    assert user is not None
    assert user.name == "Bob"


def test_get_user_by_id_not_found(sample_users):
    """Test get_user_by_id returns None when id does not exist."""
    user = get_user_by_id(sample_users, 999)
    assert user is None


@pytest.mark.parametrize(
    "price,discount_percent,expected",
    [
        (100, 0.2, 80),
        (50, 0.0, 50),
        (100, 1.0, 0),
        (99.99, 0.15, 84.9915),
    ],
)
def test_calculate_discount_basic(price, discount_percent, expected):
    """Test calculate_discount computes price minus percentage."""
    assert calculate_discount(price, discount_percent) == pytest.approx(expected)


def test_merge_dicts_overrides_and_copies():
    """Test merge_dicts returns merged dict and does not mutate inputs."""
    d1 = {"a": 1, "b": 2, "nested": {"x": 1}}
    d2 = {"b": 3, "c": 4, "nested": {"y": 2}}
    merged = merge_dicts(d1, d2)
    assert merged == {"a": 1, "b": 3, "c": 4, "nested": {"y": 2}}
    assert d1 == {"a": 1, "b": 2, "nested": {"x": 1}}
    assert d2 == {"b": 3, "c": 4, "nested": {"y": 2}}


@pytest.mark.parametrize(
    "numbers,expected",
    [
        ([-1, 0, 1, 2.5, -3.2], [1, 2.5]),
        ([], []),
        ([0, 0, 0], []),
    ],
)
def test_filter_positive_various(numbers, expected):
    """Test filter_positive returns only positive numbers."""
    assert filter_positive(numbers) == expected


def test_sort_items_sorted_input():
    """Test sort_items returns same list when already sorted."""
    assert sort_items([1, 2, 3]) == [1, 2, 3]


def test_sort_items_unsorted_duplicates_behavior():
    """Test sort_items exhibits its specific selection behavior on unsorted input."""
    assert sort_items([3, 1, 2]) == [1, 1, 2]


def test_sort_items_all_descending_behavior():
    """Test sort_items behavior on descending list per current implementation."""
    assert sort_items([3, 2, 1]) == [1, 1, 1]


@pytest.mark.parametrize(
    "password,expected",
    [
        ("short", False),
        ("password", False),
        ("password123", True),
        ("12345678", True),
    ],
)
def test_check_password_rules(password, expected):
    """Test check_password rules for length and disallowed literal."""
    assert check_password(password) == expected


def test_calculate_interest_simple_interest():
    """Test calculate_interest computes principal + simple interest."""
    total = calculate_interest(1000, 0.05, 2)
    assert total == pytest.approx(1100)


def test_process_file_reads_lines(tmp_path):
    """Test process_file reads all lines from a file."""
    p = tmp_path / "data.txt"
    p.write_text("a\nb\n")
    lines = process_file(str(p))
    assert lines == ["a\n", "b\n"]


def test_process_file_raises_when_missing():
    """Test process_file raises FileNotFoundError when file does not exist."""
    with pytest.raises(FileNotFoundError):
        process_file("nonexistent_file.txt")


@pytest.mark.parametrize(
    "value,expected",
    [
        ("10", 10),
        (3.7, 3),
        ("-5", -5),
        (0, 0),
    ],
)
def test_convert_to_int_valid_values(value, expected):
    """Test convert_to_int converts valid values to int."""
    assert convert_to_int(value) == expected


def test_convert_to_int_invalid_string_raises():
    """Test convert_to_int raises ValueError for non-integer strings."""
    with pytest.raises(ValueError):
        convert_to_int("3.7")


@pytest.mark.parametrize(
    "a,b,expected",
    [
        (10, 2, 5),
        (5, 0, 0),
        (1, 3, 1 / 3),
        (-4, 2, -2),
    ],
)
def test_safe_divide_handles_zero_and_floats(a, b, expected):
    """Test safe_divide divides when possible and returns 0 when denominator is zero."""
    result = safe_divide(a, b)
    assert result == pytest.approx(expected)


def test_get_config_value_existing_keys():
    """Test get_config_value returns known configuration values."""
    assert get_config_value("api_key") == "sk-1234567890abcdef"
    assert get_config_value("database_url") == "postgresql://user:pass@localhost/db"


def test_get_config_value_missing_key_raises():
    """Test get_config_value raises KeyError for unknown keys."""
    with pytest.raises(KeyError):
        get_config_value("missing")


def test_log_message_prints_prefix(capsys):
    """Test log_message prints with 'LOG:' prefix to stdout."""
    log_message("hello")
    captured = capsys.readouterr()
    assert captured.out.strip() == "LOG: hello"


def test_calculate_sum_basic_and_empty():
    """Test calculate_sum returns sum of numbers and handles empty list."""
    assert calculate_sum([1, 2, 3, 4]) == 10
    assert calculate_sum([]) == 0


def test_find_duplicates_collects_repeats():
    """Test find_duplicates collects each occurrence after first."""
    data = [1, 2, 1, 3, 2, 1]
    assert find_duplicates(data) == [1, 2, 1]


@pytest.mark.parametrize(
    "text,max_length,expected",
    [
        ("hello", 3, "hel"),
        ("hello", 5, "hello"),
        ("hello", 10, "hello"),
        ("", 0, ""),
    ],
)
def test_truncate_string_various(text, max_length, expected):
    """Test truncate_string truncates when exceeding max_length."""
    assert truncate_string(text, max_length) == expected


def test_parse_date_valid_string():
    """Test parse_date parses year, month, day as integers."""
    y, m, d = parse_date("2024-02-29")
    assert (y, m, d) == (2024, 2, 29)


def test_parse_date_invalid_format_raises_index_error():
    """Test parse_date raises IndexError for wrong format (missing parts)."""
    with pytest.raises(IndexError):
        parse_date("20240229")


def test_parse_date_non_numeric_raises_value_error():
    """Test parse_date raises ValueError when parts are non-numeric."""
    with pytest.raises(ValueError):
        parse_date("2024-02-xx")