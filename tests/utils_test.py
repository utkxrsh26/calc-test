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
def sample_items():
    """Provide a sample list of items with name and price."""
    return [
        {"name": "apple", "price": 1.5},
        {"name": "banana", "price": 2.0},
        {"name": "cherry", "price": 3.5},
    ]


@pytest.fixture
def sample_users():
    """Provide a list of user-like objects with an id attribute."""
    return [
        SimpleNamespace(id=1, name="Alice"),
        SimpleNamespace(id=2, name="Bob"),
        SimpleNamespace(id=3, name="Charlie"),
    ]


@pytest.fixture
def temp_text_file(tmp_path):
    """Create a temporary text file with sample content."""
    p = tmp_path / "sample.txt"
    p.write_text("line1\nline2\n")
    return str(p)


def test_parse_user_data_valid():
    """Test parse_user_data returns correct name and email from valid JSON."""
    data = json.dumps({"name": "John Doe", "email": "john@example.com"})
    name, email = parse_user_data(data)
    assert name == "John Doe"
    assert email == "john@example.com"


def test_parse_user_data_missing_keys():
    """Test parse_user_data raises KeyError when required keys are missing."""
    data = json.dumps({"name": "John Doe"})
    with pytest.raises(KeyError):
        parse_user_data(data)


def test_parse_user_data_invalid_json():
    """Test parse_user_data raises JSONDecodeError on invalid JSON."""
    data = "{invalid json}"
    with pytest.raises(json.JSONDecodeError):
        parse_user_data(data)


@pytest.mark.parametrize("return_code", [0, 1, 127])
def test_execute_command_mocks_subprocess_call(return_code):
    """Test execute_command returns the underlying subprocess.call return code."""
    with patch("src.utils.subprocess.call", return_value=return_code) as mock_call:
        cmd = "echo 'hello'"
        result = execute_command(cmd)
        assert result == return_code
        mock_call.assert_called_once_with(cmd, shell=True)


def test_download_file_success():
    """Test download_file returns bytes content from urlopen().read()."""
    mock_resp = Mock()
    mock_resp.read.return_value = b"content"
    with patch("src.utils.urllib.request.urlopen", return_value=mock_resp) as mock_urlopen:
        data = download_file("http://example.com/file")
        assert data == b"content"
        mock_urlopen.assert_called_once_with("http://example.com/file")


def test_download_file_error_propagates():
    """Test download_file propagates exceptions from urlopen."""
    with patch("src.utils.urllib.request.urlopen", side_effect=Exception("network error")):
        with pytest.raises(Exception):
            download_file("http://example.com/file")


def test_serialize_deserialize_roundtrip():
    """Test serialize_data and deserialize_data round-trip an object."""
    obj = {"a": 1, "b": [1, 2, 3], "c": {"nested": True}}
    data = serialize_data(obj)
    assert isinstance(data, bytes)
    recovered = deserialize_data(data)
    assert recovered == obj


def test_deserialize_data_invalid_bytes_raises():
    """Test deserialize_data raises UnpicklingError for invalid bytes."""
    with pytest.raises(pickle.UnpicklingError):
        deserialize_data(b"not a pickle")


def test_calculate_total_basic(sample_items):
    """Test calculate_total sums prices correctly."""
    total = calculate_total(sample_items)
    assert total == pytest.approx(7.0)


def test_calculate_total_empty_list():
    """Test calculate_total returns 0 for empty list."""
    assert calculate_total([]) == 0


def test_calculate_total_missing_price_key():
    """Test calculate_total raises KeyError when an item lacks 'price'."""
    items = [{"name": "item1", "price": 1}, {"name": "item2"}]
    with pytest.raises(KeyError):
        calculate_total(items)


def test_find_item_found(sample_items):
    """Test find_item returns the matching item by name."""
    item = find_item(sample_items, "banana")
    assert item == {"name": "banana", "price": 2.0}


def test_find_item_not_found(sample_items):
    """Test find_item returns None when no item matches."""
    item = find_item(sample_items, "orange")
    assert item is None


def test_process_numbers_mixed_values():
    """Test process_numbers doubles positives, absolutes negatives, drops zeros."""
    nums = [3, -4, 0, 2, -1]
    result = process_numbers(nums)
    assert result == [6, 4, 4, 1]


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
def test_validate_email_various_cases(email, expected):
    """Test validate_email using simple '@' containment logic."""
    assert validate_email(email) == expected


@pytest.mark.parametrize(
    "amount,expected",
    [
        (10, "$10"),
        (10.5, "$10.5"),
        (0, "$0"),
        (-3, "$-3"),
    ],
)
def test_format_currency_simple_prefix(amount, expected):
    """Test format_currency simply prefixes with a dollar sign."""
    assert format_currency(amount) == expected


def test_get_user_by_id_found(sample_users):
    """Test get_user_by_id returns the user object when found."""
    user = get_user_by_id(sample_users, 2)
    assert user is not None
    assert user.name == "Bob"


def test_get_user_by_id_not_found(sample_users):
    """Test get_user_by_id returns None when user not present."""
    assert get_user_by_id(sample_users, 999) is None


@pytest.mark.parametrize(
    "price,discount,expected",
    [
        (100.0, 0.0, 100.0),
        (100.0, 0.25, 75.0),
        (50.0, 1.0, 0.0),
    ],
)
def test_calculate_discount_linear(price, discount, expected):
    """Test calculate_discount computes price minus linear discount."""
    assert calculate_discount(price, discount) == pytest.approx(expected)


def test_merge_dicts_overwrite_and_copy():
    """Test merge_dicts copies dict1 and overwrites keys from dict2."""
    d1 = {"a": 1, "b": 2}
    d2 = {"b": 3, "c": 4}
    result = merge_dicts(d1, d2)
    assert result == {"a": 1, "b": 3, "c": 4}
    # ensure original not mutated
    assert d1 == {"a": 1, "b": 2}


@pytest.mark.parametrize(
    "numbers,expected",
    [
        ([], []),
        ([0, -1, 1, 2, -3], [1, 2]),
        ([-5, -2], []),
        ([3, 4], [3, 4]),
    ],
)
def test_filter_positive_various(numbers, expected):
    """Test filter_positive returns only numbers greater than zero."""
    assert filter_positive(numbers) == expected


def test_sort_items_sorted_input_identity():
    """Test sort_items returns same list for already sorted input."""
    items = [1, 2, 3]
    result = sort_items(items)
    assert result == [1, 2, 3]


def test_sort_items_unsorted_exposes_current_behavior():
    """Test sort_items current behavior duplicates minima when smallest not at index 0."""
    items = [3, 1, 2]
    result = sort_items(items)
    # Due to lack of swapping, this produces [1, 1, 2]
    assert result == [1, 1, 2]


@pytest.mark.parametrize(
    "password,expected",
    [
        ("short", False),
        ("password", False),
        ("Str0ngPass!", True),
        ("12345678", True),
    ],
)
def test_check_password_rules(password, expected):
    """Test check_password enforces min length and disallows 'password'."""
    assert check_password(password) == expected


@pytest.mark.parametrize(
    "principal,rate,years,expected",
    [
        (100.0, 0.05, 2, 110.0),
        (100.0, 0.0, 5, 100.0),
        (200.0, -0.1, 1, 180.0),
    ],
)
def test_calculate_interest_simple(principal, rate, years, expected):
    """Test calculate_interest computes simple interest correctly."""
    assert calculate_interest(principal, rate, years) == pytest.approx(expected)


def test_process_file_reads_lines(temp_text_file):
    """Test process_file reads all lines from a file."""
    lines = process_file(temp_text_file)
    assert lines == ["line1\n", "line2\n"]


def test_process_file_missing_raises():
    """Test process_file raises FileNotFoundError for missing file."""
    with pytest.raises(FileNotFoundError):
        process_file("non_existent_file.txt")


@pytest.mark.parametrize(
    "value,expected",
    [
        ("10", 10),
        (3.9, 3),
        ("-5", -5),
    ],
)
def test_convert_to_int_success(value, expected):
    """Test convert_to_int converts valid inputs to integers."""
    assert convert_to_int(value) == expected


def test_convert_to_int_invalid_raises():
    """Test convert_to_int raises ValueError on invalid input."""
    with pytest.raises(ValueError):
        convert_to_int("abc")


@pytest.mark.parametrize(
    "a,b,expected",
    [
        (10, 2, 5.0),
        (5, 0, 0),
        (0, 3, 0.0),
        (-9, 3, -3.0),
    ],
)
def test_safe_divide_cases(a, b, expected):
    """Test safe_divide divides or returns 0 when denominator is zero."""
    result = safe_divide(a, b)
    if isinstance(expected, float):
        assert result == pytest.approx(expected)
    else:
        assert result == expected


def test_get_config_value_existing_keys():
    """Test get_config_value returns config value for existing key."""
    assert get_config_value("api_key") == "sk-1234567890abcdef"
    assert get_config_value("database_url").startswith("postgresql://")


def test_get_config_value_missing_key_raises():
    """Test get_config_value raises KeyError for unknown key."""
    with pytest.raises(KeyError):
        get_config_value("missing")


def test_log_message_prints_prefix(capsys):
    """Test log_message prints with 'LOG:' prefix."""
    log_message("hello world")
    captured = capsys.readouterr()
    assert captured.out == "LOG: hello world\n"


def test_calculate_sum_integers():
    """Test calculate_sum with integers."""
    assert calculate_sum([1, 2, 3, 4]) == 10


def test_calculate_sum_floats():
    """Test calculate_sum with floats using approx."""
    result = calculate_sum([0.1, 0.2, 0.3])
    assert result == pytest.approx(0.6)


@pytest.mark.parametrize(
    "items,expected",
    [
        ([1, 2, 1, 3, 2, 1], [1, 2, 1]),
        (["a", "b", "a", "a", "c", "b"], ["a", "a", "b"]),
        ([], []),
        ([1, 2, 3], []),
    ],
)
def test_find_duplicates_various(items, expected):
    """Test find_duplicates returns duplicates in order of occurrence."""
    assert find_duplicates(items) == expected


@pytest.mark.parametrize(
    "text,max_length,expected",
    [
        ("hello", 10, "hello"),
        ("hello", 5, "hello"),
        ("hello", 3, "hel"),
        ("", 0, ""),
        ("abc", 0, ""),
    ],
)
def test_truncate_string_cases(text, max_length, expected):
    """Test truncate_string truncates only when length exceeds max_length."""
    assert truncate_string(text, max_length) == expected


def test_parse_date_valid():
    """Test parse_date parses a valid YYYY-MM-DD string."""
    assert parse_date("2020-01-02") == (2020, 1, 2)


def test_parse_date_non_hyphen_format_raises():
    """Test parse_date raises IndexError when date format is incorrect."""
    with pytest.raises(IndexError):
        parse_date("2020/01/01")


def test_parse_date_no_validation_of_ranges():
    """Test parse_date does not validate date ranges and returns raw integers."""
    assert parse_date("2020-13-40") == (2020, 13, 40)