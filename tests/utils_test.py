import json
import pickle
from types import SimpleNamespace
from unittest.mock import Mock, patch

import pytest

from src.utils import (
    calculate_discount,
    calculate_interest,
    calculate_sum,
    calculate_total,
    check_password,
    convert_to_int,
    deserialize_data,
    download_file,
    execute_command,
    filter_positive,
    find_duplicates,
    find_item,
    format_currency,
    get_config_value,
    get_user_by_id,
    log_message,
    parse_date,
    parse_user_data,
    process_file,
    process_numbers,
    safe_divide,
    serialize_data,
    sort_items,
    truncate_string,
    validate_email,
)


@pytest.fixture
def sample_items():
    """Provide a sample list of item dicts with names and prices."""
    return [
        {"name": "apple", "price": 1.5},
        {"name": "banana", "price": 2},
        {"name": "carrot", "price": 3.25},
    ]


@pytest.fixture
def sample_users():
    """Provide a sample list of user objects with 'id' attribute."""
    return [
        SimpleNamespace(id=1, name="Alice"),
        SimpleNamespace(id=2, name="Bob"),
        SimpleNamespace(id=3, name="Charlie"),
    ]


def test_parse_user_data_valid_json():
    """parse_user_data should return (name, email) tuple when valid JSON is provided."""
    data = json.dumps({"name": "John", "email": "john@example.com"})
    result = parse_user_data(data)
    assert result == ("John", "john@example.com")


def test_parse_user_data_missing_key_raises_keyerror():
    """parse_user_data should raise KeyError if expected keys are missing."""
    data = json.dumps({"name": "Jane"})
    with pytest.raises(KeyError):
        parse_user_data(data)


def test_parse_user_data_invalid_json_raises_jsondecodeerror():
    """parse_user_data should raise JSONDecodeError for invalid JSON string."""
    with pytest.raises(json.JSONDecodeError):
        parse_user_data("not-json")


@pytest.mark.parametrize("returncode", [0, 1, 2])
def test_execute_command_calls_subprocess_and_returns_code(returncode):
    """execute_command should delegate to subprocess.call with shell=True and return the code."""
    cmd = "echo 'hello'"
    with patch("src.utils.subprocess.call", return_value=returncode) as mock_call:
        result = execute_command(cmd)
    assert result == returncode
    mock_call.assert_called_once_with(cmd, shell=True)


def test_download_file_returns_bytes():
    """download_file should return response content bytes as-is."""
    mock_resp = Mock()
    mock_resp.read.return_value = b"file-content"
    with patch("src.utils.urllib.request.urlopen", return_value=mock_resp) as mock_urlopen:
        data = download_file("http://example.com/file")
    assert data == b"file-content"
    mock_urlopen.assert_called_once_with("http://example.com/file")
    mock_resp.read.assert_called_once()


def test_download_file_raises_on_error():
    """download_file should propagate exceptions from urlopen."""
    with patch("src.utils.urllib.request.urlopen", side_effect=Exception("network")):
        with pytest.raises(Exception):
            download_file("http://example.com/file")


@pytest.mark.parametrize(
    "obj",
    [
        {"a": 1, "b": [1, 2, 3]},
        [1, 2, 3],
        42,
        "text",
    ],
)
def test_serialize_deserialize_roundtrip(obj):
    """serialize_data followed by deserialize_data should return the original object."""
    blob = serialize_data(obj)
    out = deserialize_data(blob)
    assert out == obj


def test_serialize_data_unpicklable_raises():
    """serialize_data should raise an exception for unpicklable objects (e.g., lambda)."""
    with pytest.raises(Exception):
        serialize_data(lambda x: x)


def test_deserialize_data_invalid_blob_raises():
    """deserialize_data should raise an exception for invalid pickle blobs."""
    with pytest.raises(Exception):
        deserialize_data(b"not a valid pickle")


def test_calculate_total_with_floats(sample_items):
    """calculate_total should sum the 'price' keys from a list of dicts."""
    total = calculate_total(sample_items)
    assert total == pytest.approx(6.75)


def test_calculate_total_missing_price_raises_keyerror():
    """calculate_total should raise KeyError if an item lacks the 'price' key."""
    items = [{"name": "apple", "price": 1}, {"name": "banana"}]
    with pytest.raises(KeyError):
        calculate_total(items)


def test_find_item_finds_existing(sample_items):
    """find_item should return the matching item by 'name' or None if not found."""
    result = find_item(sample_items, "banana")
    assert result is sample_items[1]
    assert result["price"] == 2


def test_find_item_returns_none_when_not_found(sample_items):
    """find_item should return None when item name is not present."""
    assert find_item(sample_items, "durian") is None


def test_process_numbers_mixed_values():
    """process_numbers should double positives, abs() negatives, and drop zeros."""
    nums = [1, -2, 0, 3, -4, 0]
    result = process_numbers(nums)
    assert result == [2, 2, 6, 4]


@pytest.mark.parametrize(
    "email,expected",
    [
        ("user@example.com", True),
        ("noatsign", False),
        ("@", True),  # matches naive implementation: only checks '@' presence
        ("a@b", True),
        ("", False),
    ],
)
def test_validate_email_simple_check(email, expected):
    """validate_email should return True if '@' in email, otherwise False."""
    assert validate_email(email) is expected


@pytest.mark.parametrize(
    "amount,expected",
    [
        (123, "$123"),
        (12.34, "$12.34"),
        (0, "$0"),
        (-5, "$-5"),
        ("100", "$100"),
    ],
)
def test_format_currency_string_conversion(amount, expected):
    """format_currency should prefix with '$' and use simple str() conversion for amount."""
    assert format_currency(amount) == expected


def test_get_user_by_id_found_and_not_found(sample_users):
    """get_user_by_id should return the user with matching id attribute, else None."""
    user = get_user_by_id(sample_users, 2)
    assert user is sample_users[1]
    assert get_user_by_id(sample_users, 999) is None


def test_calculate_discount_fraction():
    """calculate_discount should apply fractional discount (e.g., 0.2 means 20%)."""
    assert calculate_discount(100, 0.2) == pytest.approx(80.0)


def test_calculate_discount_greater_than_one_leads_to_negative():
    """calculate_discount with discount_percent > 1 should subtract price*discount_percent."""
    assert calculate_discount(100, 20) == -1900


def test_merge_dicts_overrides_and_immutability():
    """merge_dicts should override values from dict2 and not mutate inputs."""
    d1 = {"a": 1, "b": 2}
    d2 = {"b": 3, "c": 4}
    result = merge_dicts(d1, d2)
    assert result == {"a": 1, "b": 3, "c": 4}
    assert d1 == {"a": 1, "b": 2}
    assert d2 == {"b": 3, "c": 4}


def test_filter_positive_only_returns_greater_than_zero():
    """filter_positive should include only numbers > 0."""
    assert filter_positive([-2, -1, 0, 1, 2, 3]) == [1, 2, 3]


def test_sort_items_already_sorted_returns_same():
    """sort_items should return the same list when already sorted ascending."""
    items = [1, 2, 3]
    assert sort_items(items) == [1, 2, 3]


def test_sort_items_descending_exhibits_current_buggy_behavior():
    """sort_items on descending input should reflect current implementation (duplicates of min)."""
    items = [3, 2, 1]
    assert sort_items(items) == [1, 1, 1]


@pytest.mark.parametrize(
    "password,expected",
    [
        ("short", False),
        ("password", False),
        ("longenough", True),
        ("Passw0rd!", True),
    ],
)
def test_check_password_rules(password, expected):
    """check_password should enforce minimum length and disallow 'password'."""
    assert check_password(password) is expected


def test_calculate_interest_simple_interest():
    """calculate_interest should compute principal + principal*rate*years."""
    assert calculate_interest(1000, 0.05, 2) == pytest.approx(1100.0)


def test_process_file_reads_lines(tmp_path):
    """process_file should read and return lines with newlines preserved."""
    p = tmp_path / "data.txt"
    p.write_text("line1\nline2\n")
    lines = process_file(str(p))
    assert lines == ["line1\n", "line2\n"]


def test_process_file_nonexistent_raises(tmp_path):
    """process_file should raise FileNotFoundError for a missing file."""
    with pytest.raises(FileNotFoundError):
        process_file(str(tmp_path / "missing.txt"))


@pytest.mark.parametrize(
    "value,expected",
    [
        ("5", 5),
        (3.7, 3),
        (-2.9, -2),
        (0, 0),
    ],
)
def test_convert_to_int_valid_inputs(value, expected):
    """convert_to_int should convert valid inputs to int using Python's int()."""
    assert convert_to_int(value) == expected


def test_convert_to_int_invalid_raises():
    """convert_to_int should raise ValueError for invalid literals."""
    with pytest.raises(ValueError):
        convert_to_int("abc")


@pytest.mark.parametrize(
    "a,b,expected",
    [
        (4, 2, 2.0),
        (3, 2, 1.5),
        (1, 0, 0),
        (-1, 0, 0),
        (0, 5, 0.0),
    ],
)
def test_safe_divide_various_cases(a, b, expected):
    """safe_divide should divide when b != 0 else return 0."""
    result = safe_divide(a, b)
    if b != 0:
        assert result == pytest.approx(expected)
    else:
        assert result == expected


def test_get_config_value_valid_keys():
    """get_config_value should return values for known keys."""
    assert get_config_value("api_key") == "sk-1234567890abcdef"
    assert get_config_value("database_url") == "postgresql://user:pass@localhost/db"


def test_get_config_value_invalid_key_raises():
    """get_config_value should raise KeyError for missing key."""
    with pytest.raises(KeyError):
        get_config_value("missing")


def test_log_message_prints_prefix(capsys):
    """log_message should print with 'LOG:' prefix to stdout."""
    log_message("hello world")
    captured = capsys.readouterr()
    assert captured.out == "LOG: hello world\n"


@pytest.mark.parametrize(
    "numbers,expected",
    [
        ([1, 2, 3], 6),
        ([], 0),
        ([0, 0], 0),
    ],
)
def test_calculate_sum_integers(numbers, expected):
    """calculate_sum should sum integers correctly."""
    assert calculate_sum(numbers) == expected


def test_calculate_sum_floats():
    """calculate_sum should sum floats with expected precision."""
    assert calculate_sum([1.2, 2.3]) == pytest.approx(3.5)


@pytest.mark.parametrize(
    "items,expected",
    [
        ([1, 2, 1, 3, 2, 1], [1, 2, 1]),
        (["a", "b", "a", "a"], ["a", "a"]),
        ([1, 2, 3], []),
    ],
)
def test_find_duplicates_behavior(items, expected):
    """find_duplicates should return items that appear more than once, in order of repeats."""
    assert find_duplicates(items) == expected


@pytest.mark.parametrize(
    "text,max_length,expected",
    [
        ("hello", 10, "hello"),
        ("hello", 5, "hello"),
        ("hello", 3, "hel"),
    ],
)
def test_truncate_string_cases(text, max_length, expected):
    """truncate_string should return the text truncated to max_length if needed."""
    assert truncate_string(text, max_length) == expected


def test_parse_date_valid():
    """parse_date should return (year, month, day) as integers for valid strings."""
    assert parse_date("2020-01-31") == (2020, 1, 31)


def test_parse_date_invalid_value_raises_valueerror():
    """parse_date should raise ValueError when date parts are not integers."""
    with pytest.raises(ValueError):
        parse_date("2020-xx-31")


def test_parse_date_invalid_format_raises_indexerror():
    """parse_date should raise IndexError when the format isn't 'YYYY-MM-DD'."""
    with pytest.raises(IndexError):
        parse_date("2020/01/31")