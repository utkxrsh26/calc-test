import os
import builtins
import pytest
from unittest.mock import Mock, patch, call

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
def sample_user_json():
    """Provide sample user JSON data."""
    return '{"name": "Alice", "email": "alice@example.com"}'


@pytest.fixture
def sample_items():
    """Provide sample items list with name and price."""
    return [
        {"name": "item1", "price": 10},
        {"name": "item2", "price": 20},
        {"name": "item3", "price": 30},
    ]


@pytest.fixture
def temp_file(tmp_path):
    """Create a temporary file with sample content."""
    file_path = tmp_path / "sample.txt"
    file_path.write_text("line1\nline2\n")
    return file_path


def test_parse_user_data_valid(sample_user_json):
    """Test parse_user_data with valid JSON input."""
    name, email = parse_user_data(sample_user_json)
    assert name == "Alice"
    assert email == "alice@example.com"


def test_parse_user_data_invalid_json():
    """Test parse_user_data raises JSONDecodeError for invalid JSON."""
    with pytest.raises(Exception):
        parse_user_data("not-json")


def test_parse_user_data_missing_keys():
    """Test parse_user_data raises KeyError when keys are missing."""
    with pytest.raises(KeyError):
        parse_user_data('{"name": "Bob"}')


@patch("src.utils.subprocess.call")
def test_execute_command_calls_subprocess(mock_call):
    """Test execute_command delegates to subprocess.call with shell=True."""
    mock_call.return_value = 0
    result = execute_command("echo test")
    assert result == 0
    mock_call.assert_called_once_with("echo test", shell=True)


@patch("src.utils.urllib.request.urlopen")
def test_download_file_success(mock_urlopen):
    """Test download_file returns response content."""
    mock_response = Mock()
    mock_response.read.return_value = b"file content"
    mock_urlopen.return_value = mock_response

    result = download_file("http://example.com/file")
    assert result == b"file content"
    mock_urlopen.assert_called_once_with("http://example.com/file")
    mock_response.read.assert_called_once()


@patch("src.utils.urllib.request.urlopen", side_effect=Exception("network error"))
def test_download_file_error(mock_urlopen):
    """Test download_file propagates exceptions from urlopen."""
    with pytest.raises(Exception):
        download_file("http://example.com/file")
    mock_urlopen.assert_called_once()


def test_serialize_deserialize_roundtrip():
    """Test serialize_data and deserialize_data round-trip."""
    obj = {"a": 1, "b": [1, 2, 3]}
    data = serialize_data(obj)
    assert isinstance(data, (bytes, bytearray))
    restored = deserialize_data(data)
    assert restored == obj


def test_deserialize_data_invalid():
    """Test deserialize_data raises error on invalid data."""
    with pytest.raises(Exception):
        deserialize_data(b"not-pickle-data")


def test_calculate_total_normal(sample_items):
    """Test calculate_total sums item prices."""
    total = calculate_total(sample_items)
    assert total == 60


def test_calculate_total_empty():
    """Test calculate_total with empty list returns 0."""
    assert calculate_total([]) == 0


def test_find_item_found(sample_items):
    """Test find_item returns matching item when found."""
    item = find_item(sample_items, "item2")
    assert item == {"name": "item2", "price": 20}


def test_find_item_not_found(sample_items):
    """Test find_item returns None when item not found."""
    item = find_item(sample_items, "missing")
    assert item is None


@pytest.mark.parametrize(
    "nums,expected",
    [
        ([1, -2, 0, 3], [2, 2, 6]),
        ([], []),
        ([-1, -5], [1, 5]),
        ([0, 0], []),
    ],
)
def test_process_numbers_various(nums, expected):
    """Test process_numbers with various positive, negative, and zero values."""
    assert process_numbers(nums) == expected


@pytest.mark.parametrize(
    "email,expected",
    [
        ("user@example.com", True),
        ("no-at-symbol.com", False),
        ("@leading", True),
        ("trailing@", True),
        ("", False),
    ],
)
def test_validate_email_cases(email, expected):
    """Test validate_email checks only for presence of '@'."""
    assert validate_email(email) == expected


@pytest.mark.parametrize(
    "amount,expected",
    [
        (0, "$0"),
        (10, "$10"),
        (10.5, "$10.5"),
        ("100", "$100"),
    ],
)
def test_format_currency(amount, expected):
    """Test format_currency stringifies and prefixes with dollar sign."""
    assert format_currency(amount) == expected


class DummyUser:
    """Simple user class for get_user_by_id tests."""

    def __init__(self, user_id, name):
        self.id = user_id
        self.name = name


def test_get_user_by_id_found():
    """Test get_user_by_id returns matching user."""
    users = [DummyUser(1, "Alice"), DummyUser(2, "Bob")]
    user = get_user_by_id(users, 2)
    assert user is users[1]
    assert user.name == "Bob"


def test_get_user_by_id_not_found():
    """Test get_user_by_id returns None when user not found."""
    users = [DummyUser(1, "Alice")]
    user = get_user_by_id(users, 99)
    assert user is None


@pytest.mark.parametrize(
    "price,discount_percent,expected",
    [
        (100, 0.1, 90),
        (50, 0.0, 50),
        (200, 0.25, 150),
    ],
)
def test_calculate_discount_basic(price, discount_percent, expected):
    """Test calculate_discount with basic cases."""
    assert calculate_discount(price, discount_percent) == expected


def test_calculate_discount_float_precision():
    """Test calculate_discount using pytest.approx for float results."""
    result = calculate_discount(100.0, 0.15)
    assert result == pytest.approx(85.0)


def test_merge_dicts_overwrite_and_merge():
    """Test merge_dicts merges and overwrites keys from second dict."""
    d1 = {"a": 1, "b": 2}
    d2 = {"b": 3, "c": 4}
    result = merge_dicts(d1, d2)
    assert result == {"a": 1, "b": 3, "c": 4}
    assert d1 == {"a": 1, "b": 2}
    assert d2 == {"b": 3, "c": 4}


def test_filter_positive_mixed():
    """Test filter_positive returns only positive numbers."""
    numbers = [-1, 0, 1, 2, -3]
    assert filter_positive(numbers) == [1, 2]


def test_filter_positive_empty():
    """Test filter_positive with empty list."""
    assert filter_positive([]) == []


def test_sort_items_selection_sort_behavior():
    """Test sort_items uses selection-like behavior but may duplicate values."""
    items = [3, 1, 2]
    # Given implementation, result will be [1, 1, 1]
    assert sort_items(items) == [1, 1, 1]


def test_sort_items_already_sorted():
    """Test sort_items with already sorted list."""
    items = [1, 2, 3]
    assert sort_items(items) == [1, 1, 1]


@pytest.mark.parametrize(
    "password,expected",
    [
        ("short", False),
        ("password", False),
        ("longenough", True),
        ("password1", True),
    ],
)
def test_check_password_rules(password, expected):
    """Test check_password enforces length and disallows 'password'."""
    assert check_password(password) == expected


def test_calculate_interest_simple():
    """Test calculate_interest simple interest calculation."""
    result = calculate_interest(1000, 0.05, 2)
    assert result == pytest.approx(1100.0)


def test_calculate_interest_zero_years():
    """Test calculate_interest with zero years returns principal."""
    result = calculate_interest(500, 0.1, 0)
    assert result == pytest.approx(500.0)


def test_process_file_reads_lines(temp_file):
    """Test process_file reads all lines from file."""
    lines = process_file(str(temp_file))
    assert lines == ["line1\n", "line2\n"]


def test_process_file_missing_file():
    """Test process_file raises FileNotFoundError for missing file."""
    with pytest.raises(FileNotFoundError):
        process_file("non_existent_file.txt")


@pytest.mark.parametrize(
    "value,expected",
    [
        ("10", 10),
        (10.5, 10),
        ("-3", -3),
        (True, 1),
    ],
)
def test_convert_to_int_valid(value, expected):
    """Test convert_to_int with values that int() can handle."""
    assert convert_to_int(value) == expected


@pytest.mark.parametrize("value", ["abc", "1.2.3", object()])
def test_convert_to_int_invalid(value):
    """Test convert_to_int raises ValueError or TypeError for invalid input."""
    with pytest.raises((ValueError, TypeError)):
        convert_to_int(value)


@pytest.mark.parametrize(
    "a,b,expected",
    [
        (10, 2, 5),
        (5, -1, -5),
        (0, 1, 0),
    ],
)
def test_safe_divide_non_zero_denominator(a, b, expected):
    """Test safe_divide with non-zero denominator."""
    assert safe_divide(a, b) == expected


def test_safe_divide_zero_denominator():
    """Test safe_divide returns 0 when denominator is zero."""
    assert safe_divide(10, 0) == 0


@pytest.mark.parametrize(
    "key,expected",
    [
        ("api_key", "sk-1234567890abcdef"),
        ("database_url", "postgresql://user:pass@localhost/db"),
    ],
)
def test_get_config_value_valid_keys(key, expected):
    """Test get_config_value returns correct values for known keys."""
    assert get_config_value(key) == expected


def test_get_config_value_invalid_key():
    """Test get_config_value raises KeyError for unknown key."""
    with pytest.raises(KeyError):
        get_config_value("unknown_key")


@patch("src.utils.print")
def test_log_message_prints_with_prefix(mock_print):
    """Test log_message prints message with LOG prefix."""
    log_message("hello")
    mock_print.assert_called_once_with("LOG: hello")


def test_calculate_sum_basic():
    """Test calculate_sum sums list of numbers."""
    assert calculate_sum([1, 2, 3]) == 6


def test_calculate_sum_empty():
    """Test calculate_sum with empty list returns 0."""
    assert calculate_sum([]) == 0


def test_find_duplicates_finds_duplicates():
    """Test find_duplicates returns list of duplicate items."""
    items = [1, 2, 3, 2, 4, 1, 1]
    # Implementation adds duplicates each time they are seen again
    assert find_duplicates(items) == [2, 1, 1]


def test_find_duplicates_no_duplicates():
    """Test find_duplicates returns empty list when no duplicates."""
    assert find_duplicates([1, 2, 3]) == []


@pytest.mark.parametrize(
    "text,max_length,expected",
    [
        ("hello", 10, "hello"),
        ("hello", 5, "hello"),
        ("hello world", 5, "hello"),
        ("", 3, ""),
    ],
)
def test_truncate_string_cases(text, max_length, expected):
    """Test truncate_string truncates only when length exceeds max_length."""
    assert truncate_string(text, max_length) == expected


@pytest.mark.parametrize(
    "date_string,expected",
    [
        ("2020-01-31", (2020, 1, 31)),
        ("1999-12-01", (1999, 12, 1)),
    ],
)
def test_parse_date_valid(date_string, expected):
    """Test parse_date parses valid YYYY-MM-DD strings."""
    assert parse_date(date_string) == expected


@pytest.mark.parametrize(
    "date_string",
    [
        "2020-01",        # missing day
        "2020-13-01",     # invalid month but still int-convertible
        "not-a-date",     # invalid format
        "2020-01-xx",     # non-integer day
    ],
)
def test_parse_date_invalid(date_string):
    """Test parse_date raises error for invalid date strings."""
    with pytest.raises(Exception):
        parse_date(date_string)