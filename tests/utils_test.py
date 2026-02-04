import json
import pickle
import pytest
from unittest.mock import Mock, patch
from urllib.error import URLError

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
    return [
        {"price": 10},
        {"price": 20.5},
        {"price": 0},
    ]


@pytest.fixture
def sample_users():
    class User:
        def __init__(self, uid, name):
            self.id = uid
            self.name = name

        def __repr__(self):
            return f"User(id={self.id}, name={self.name})"

    return [User(1, "Alice"), User(2, "Bob"), User(3, "Carol")]


def test_parse_user_data_valid_json():
    """Parse valid JSON returning name and email tuple."""
    data = json.dumps({"name": "Alice", "email": "alice@example.com"})
    name, email = parse_user_data(data)
    assert name == "Alice"
    assert email == "alice@example.com"


def test_parse_user_data_invalid_json_raises():
    """Invalid JSON should raise a JSONDecodeError."""
    with pytest.raises(json.JSONDecodeError):
        parse_user_data("not json")


def test_parse_user_data_missing_keys_raises():
    """Missing keys in parsed JSON should raise a KeyError."""
    data = json.dumps({"name": "Alice"})
    with pytest.raises(KeyError):
        parse_user_data(data)


def test_execute_command_calls_subprocess_call():
    """Ensure execute_command delegates to subprocess.call with shell=True."""
    with patch("src.utils.subprocess.call") as mock_call:
        mock_call.return_value = 0
        rc = execute_command("echo 'hello'")
        mock_call.assert_called_once()
        args, kwargs = mock_call.call_args
        assert args[0] == "echo 'hello'"
        assert kwargs.get("shell") is True
        assert rc == 0


def test_execute_command_raises_propagates():
    """Errors from subprocess.call should propagate."""
    with patch("src.utils.subprocess.call", side_effect=OSError("boom")):
        with pytest.raises(OSError):
            execute_command("bad command")


def test_download_file_returns_bytes():
    """download_file should return bytes read from urlopen response."""
    mock_resp = Mock()
    mock_resp.read.return_value = b"file-content"
    with patch("src.utils.urllib.request.urlopen", return_value=mock_resp) as mock_urlopen:
        data = download_file("http://example.com/file.txt")
        mock_urlopen.assert_called_once_with("http://example.com/file.txt")
        assert data == b"file-content"


def test_download_file_network_error_propagates():
    """URLError from urlopen should propagate."""
    with patch("src.utils.urllib.request.urlopen", side_effect=URLError("network")):
        with pytest.raises(URLError):
            download_file("http://example.com/file.txt")


def test_serialize_deserialize_roundtrip():
    """Round-trip serialization/deserialization using pickle."""
    obj = {"a": [1, 2, 3], "b": {"x": "y"}}
    data = serialize_data(obj)
    assert isinstance(data, (bytes, bytearray))
    restored = deserialize_data(data)
    assert restored == obj


def test_deserialize_data_invalid_raises():
    """Invalid pickle data should raise an exception."""
    with pytest.raises(Exception):
        deserialize_data(b"not a pickle")


def test_calculate_total_basic(sample_items):
    """Calculate total should sum price fields."""
    total = calculate_total(sample_items)
    assert total == pytest.approx(30.5)


def test_calculate_total_missing_price_raises():
    """Missing price key should raise KeyError."""
    items = [{"price": 10}, {"no_price": 2}]
    with pytest.raises(KeyError):
        calculate_total(items)


def test_find_item_found():
    """find_item should return the dict with matching name when found."""
    items = [{"name": "apple"}, {"name": "banana"}]
    result = find_item(items, "banana")
    assert result == {"name": "banana"}


def test_find_item_not_found():
    """find_item should return None when no item matches."""
    items = [{"name": "apple"}, {"name": "banana"}]
    result = find_item(items, "cherry")
    assert result is None


@pytest.mark.parametrize(
    "nums,expected",
    [
        ([], []),
        ([0, 0], []),
        ([-2, 0, 3], [2, 6]),
        ([1, -1, -2, 2, 0], [2, 1, 2, 4]),
    ],
)
def test_process_numbers_various(nums, expected):
    """process_numbers should double positives and abs negatives; ignore zeros."""
    assert process_numbers(nums) == expected


@pytest.mark.parametrize(
    "email,expected",
    [
        ("a@b", True),
        ("user@domain.com", True),
        ("invalid", False),
        ("", False),
        ("@", True),
    ],
)
def test_validate_email_cases(email, expected):
    """validate_email returns True if '@' in email, else False."""
    assert validate_email(email) is expected


@pytest.mark.parametrize(
    "amount,expected",
    [
        (12.34, "$12.34"),
        (0, "$0"),
        (-5, "$-5"),
    ],
)
def test_format_currency_basic(amount, expected):
    """format_currency should prefix with '$' and convert to string."""
    assert format_currency(amount) == expected


def test_get_user_by_id_found_and_not_found(sample_users):
    """get_user_by_id should locate matching user by id attribute or return None."""
    user = get_user_by_id(sample_users, 2)
    assert user is not None and user.name == "Bob"
    assert get_user_by_id(sample_users, 99) is None


@pytest.mark.parametrize(
    "price,disc,expected",
    [
        (100, 0.1, 90.0),
        (100, 10, -900.0),
        (0, 0.5, 0.0),
    ],
)
def test_calculate_discount_behaviour(price, disc, expected):
    """calculate_discount applies discount as price * discount_percent."""
    assert calculate_discount(price, disc) == pytest.approx(expected)


def test_merge_dicts_basic():
    """merge_dicts should override keys from second dict and keep others."""
    d1 = {"a": 1, "b": 2}
    d2 = {"b": 3, "c": 4}
    result = merge_dicts(d1, d2)
    assert result == {"a": 1, "b": 3, "c": 4}
    assert d1 == {"a": 1, "b": 2}
    assert d2 == {"b": 3, "c": 4}


def test_filter_positive_simple():
    """filter_positive should include only numbers greater than zero."""
    nums = [-1, 0, 1, 2, -3, 4]
    assert filter_positive(nums) == [1, 2, 4]


@pytest.mark.parametrize(
    "items,expected",
    [
        ([3, 1, 2], [1, 1, 2]),
        ([1, 2, 3], [1, 2, 3]),
        ([2, 2], [2, 2]),
    ],
)
def test_sort_items_behavior(items, expected):
    """sort_items should produce selection of minimums per suffix as implemented."""
    assert sort_items(items) == expected


@pytest.mark.parametrize(
    "password,expected",
    [
        ("short", False),
        ("password", False),
        ("longenough", True),
        ("anotherGoodOne", True),
    ],
)
def test_check_password_various(password, expected):
    """check_password validates length and disallows 'password'."""
    assert check_password(password) is expected


def test_calculate_interest_simple():
    """calculate_interest computes simple interest."""
    assert calculate_interest(1000, 0.05, 2) == pytest.approx(1100.0)


def test_process_file_reads_lines(tmp_path):
    """process_file should read all lines from a file."""
    p = tmp_path / "data.txt"
    content = "line1\nline2\n"
    p.write_text(content)
    lines = process_file(str(p))
    assert lines == ["line1\n", "line2\n"]


def test_convert_to_int_valid_and_invalid():
    """convert_to_int should convert numeric strings and raise for invalid."""
    assert convert_to_int("10") == 10
    with pytest.raises(ValueError):
        convert_to_int("not-an-int")


def test_safe_divide_basic():
    """safe_divide should divide when b != 0 else return 0."""
    assert safe_divide(10, 2) == pytest.approx(5.0)
    assert safe_divide(10, 0) == 0


def test_get_config_value_existing_and_missing():
    """get_config_value should return existing value and raise KeyError for missing."""
    assert get_config_value("api_key") == "sk-1234567890abcdef"
    with pytest.raises(KeyError):
        get_config_value("missing")


def test_log_message_prints_prefix(capsys):
    """log_message should print with 'LOG: ' prefix."""
    log_message("hello")
    captured = capsys.readouterr()
    assert "LOG: hello" in captured.out


def test_calculate_sum_basic():
    """calculate_sum should sum the list of numbers."""
    assert calculate_sum([1, 2, 3, 4]) == 10


def test_find_duplicates_multiple():
    """find_duplicates should include repeated duplicates for multiple occurrences."""
    items = [1, 2, 1, 1, 3, 2, 2]
    assert find_duplicates(items) == [1, 1, 2, 2]


def test_truncate_string_behavior():
    """truncate_string should cut strings longer than max_length."""
    assert truncate_string("abcdef", 4) == "abcd"
    assert truncate_string("abc", 5) == "abc"


def test_parse_date_valid_and_invalid():
    """parse_date should parse valid dates and raise for invalid format."""
    assert parse_date("2020-01-02") == (2020, 1, 2)
    with pytest.raises(IndexError):
        parse_date("2020/01/02")