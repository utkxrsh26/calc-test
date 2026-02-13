import json
import pickle
import pytest
from unittest.mock import patch, Mock
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
def sample_user_json():
    return json.dumps({"name": "Alice", "email": "alice@example.com"})


@pytest.fixture
def sample_items():
    return [
        {"name": "apple", "price": 1.5},
        {"name": "banana", "price": 0.75},
        {"name": "cherry", "price": 2.25},
    ]


class SimpleUser:
    def __init__(self, id, name):
        self.id = id
        self.name = name


@pytest.fixture
def sample_users():
    return [SimpleUser(1, "Alice"), SimpleUser(2, "Bob"), SimpleUser(3, "Carol")]


def test_parse_user_data_valid(sample_user_json):
    """Parse valid JSON with name and email"""
    name, email = parse_user_data(sample_user_json)
    assert name == "Alice"
    assert email == "alice@example.com"


def test_parse_user_data_missing_fields():
    """Parsing JSON missing required fields raises KeyError"""
    bad_json = json.dumps({"name": "Bob"})
    with pytest.raises(KeyError):
        parse_user_data(bad_json)


def test_parse_user_data_invalid_json():
    """Invalid JSON raises JSONDecodeError"""
    with pytest.raises(json.JSONDecodeError):
        parse_user_data("{invalid-json}")


@pytest.mark.parametrize("return_code", [0, 1, 127])
def test_execute_command_return_code_and_shell_flag(return_code):
    """execute_command returns subprocess.call code and uses shell=True"""
    with patch("src.utils.subprocess.call", return_value=return_code) as mock_call:
        code = execute_command("echo 'hi'")
        assert code == return_code
        mock_call.assert_called_once_with("echo 'hi'", shell=True)


def test_download_file_success():
    """download_file returns bytes from response.read()"""
    expected = b"file-bytes"
    mock_resp = Mock()
    mock_resp.read.return_value = expected
    with patch("src.utils.urllib.request.urlopen", return_value=mock_resp) as mock_urlopen:
        data = download_file("http://example.com/file")
        assert data == expected
        mock_urlopen.assert_called_once_with("http://example.com/file")


def test_download_file_error_propagates():
    """download_file propagates URLError"""
    with patch("src.utils.urllib.request.urlopen", side_effect=URLError("fail")):
        with pytest.raises(URLError):
            download_file("http://bad.example.com/file")


def test_serialize_deserialize_round_trip():
    """serialize_data and deserialize_data round-trip with pickle"""
    obj = {"a": [1, 2, 3], "b": {"c": "d"}}
    data = serialize_data(obj)
    assert isinstance(data, (bytes, bytearray))
    back = deserialize_data(data)
    assert back == obj


def test_serialize_unserializable_object_raises():
    """serialize_data raises for unserializable objects"""
    with pytest.raises(Exception):
        serialize_data(lambda x: x)


def test_deserialize_invalid_type_raises():
    """deserialize_data with non-bytes raises TypeError"""
    with pytest.raises((TypeError, pickle.UnpicklingError, AttributeError, ValueError)):
        deserialize_data("not-bytes")  # type: ignore[arg-type]


def test_calculate_total_happy_path(sample_items):
    """calculate_total sums item['price'] values"""
    total = calculate_total(sample_items)
    assert total == pytest.approx(1.5 + 0.75 + 2.25)


def test_calculate_total_missing_price_raises():
    """calculate_total raises KeyError when item lacks 'price'"""
    items = [{"name": "apple", "price": 1.0}, {"name": "banana"}]
    with pytest.raises(KeyError):
        calculate_total(items)


def test_find_item_found(sample_items):
    """find_item returns the matching item by name"""
    found = find_item(sample_items, "banana")
    assert found == {"name": "banana", "price": 0.75}


def test_find_item_not_found(sample_items):
    """find_item returns None when item not found"""
    assert find_item(sample_items, "durian") is None


def test_find_item_missing_name_key_raises():
    """find_item raises KeyError when an item lacks 'name'"""
    items = [{"price": 1.0}, {"name": "ok", "price": 2.0}]
    with pytest.raises(KeyError):
        find_item(items, "ok")


def test_process_numbers_mixed_values():
    """process_numbers doubles positives and abs for negatives; omits zeros"""
    nums = [-3, -1, 0, 1, 2, 5]
    result = process_numbers(nums)
    assert result == [3, 2, 2, 4, 10]


@pytest.mark.parametrize(
    "email,expected",
    [
        ("a@b.com", True),
        ("user@example", True),
        ("@", True),
        ("no-at-symbol", False),
        ("", False),
    ],
)
def test_validate_email_simple_check(email, expected):
    """validate_email checks for presence of '@' only"""
    assert validate_email(email) is expected


@pytest.mark.parametrize(
    "amount,expected",
    [
        (10, "$10"),
        (12.5, "$12.5"),
        (-0.5, "$-0.5"),
    ],
)
def test_format_currency_output(amount, expected):
    """format_currency prefixes with '$' and str(amount)"""
    assert format_currency(amount) == expected


def test_get_user_by_id_found(sample_users):
    """get_user_by_id returns user matching id attribute"""
    user = get_user_by_id(sample_users, 2)
    assert isinstance(user, SimpleUser)
    assert user.name == "Bob"


def test_get_user_by_id_not_found(sample_users):
    """get_user_by_id returns None when not found"""
    assert get_user_by_id(sample_users, 999) is None


def test_get_user_by_id_with_dicts_raises():
    """get_user_by_id with dicts raises AttributeError due to attribute access"""
    users = [{"id": 1, "name": "Alice"}]
    with pytest.raises(AttributeError):
        get_user_by_id(users, 1)


@pytest.mark.parametrize(
    "price,discount,expected",
    [
        (100.0, 0.2, 80.0),   # 20% represented as 0.2
        (50.0, 0.0, 50.0),
        (10.0, 1.0, 0.0),     # 100% off represented as 1.0
    ],
)
def test_calculate_discount_fraction_behavior(price, discount, expected):
    """calculate_discount treats discount as fraction of price"""
    assert calculate_discount(price, discount) == pytest.approx(expected)


def test_merge_dicts_overrides():
    """merge_dicts copies dict1 and overrides with dict2"""
    a = {"x": 1, "y": {"z": 1}, "keep": True}
    b = {"y": 2, "new": "val"}
    merged = merge_dicts(a, b)
    assert merged == {"x": 1, "y": 2, "keep": True, "new": "val"}
    # Ensure original a unchanged
    assert a == {"x": 1, "y": {"z": 1}, "keep": True}


def test_filter_positive_basic():
    """filter_positive returns only numbers > 0"""
    nums = [-2, 0, 1, 3, -1, 2]
    assert filter_positive(nums) == [1, 3, 2]


def test_filter_positive_type_error_on_mixed_types():
    """filter_positive raises TypeError when comparing non-numeric to int"""
    nums = [1, "2", 3]
    with pytest.raises(TypeError):
        filter_positive(nums)


def test_sort_items_bug_descending_list():
    """sort_items demonstrates selection-like bug on descending list"""
    result = sort_items([3, 2, 1])
    assert result == [1, 1, 1]


def test_sort_items_already_sorted():
    """sort_items returns same list when already sorted ascending"""
    result = sort_items([1, 2, 3])
    assert result == [1, 2, 3]


@pytest.mark.parametrize(
    "password,expected",
    [
        ("short", False),
        ("password", False),
        ("strongPass1", True),
        ("1234567", False),
        ("abcdefgh", True),
    ],
)
def test_check_password_rules(password, expected):
    """check_password enforces length >= 8 and not equal to 'password'"""
    assert check_password(password) is expected


def test_calculate_interest_simple():
    """calculate_interest computes simple interest and adds to principal"""
    principal = 1000
    rate = 0.05
    years = 3
    total = calculate_interest(principal, rate, years)
    assert total == pytest.approx(1000 + 1000 * 0.05 * 3)


def test_process_file_reads_lines(tmp_path):
    """process_file returns list of lines with newlines"""
    p = tmp_path / "data.txt"
    p.write_text("line1\nline2\n")
    lines = process_file(str(p))
    assert lines == ["line1\n", "line2\n"]


def test_process_file_not_found_raises(tmp_path):
    """process_file raises FileNotFoundError when file does not exist"""
    with pytest.raises(FileNotFoundError):
        process_file(str(tmp_path / "missing.txt"))


@pytest.mark.parametrize(
    "value,expected",
    [
        ("10", 10),
        (5, 5),
        (3.0, 3),
        (True, 1),
    ],
)
def test_convert_to_int_valid(value, expected):
    """convert_to_int converts various values to int"""
    assert convert_to_int(value) == expected


def test_convert_to_int_invalid_raises():
    """convert_to_int raises ValueError for non-numeric string"""
    with pytest.raises(ValueError):
        convert_to_int("abc")


@pytest.mark.parametrize(
    "a,b,expected",
    [
        (10, 2, 5.0),
        (3, 0, 0),
        (-4, 2, -2.0),
    ],
)
def test_safe_divide_cases(a, b, expected):
    """safe_divide divides or returns 0 when b == 0"""
    result = safe_divide(a, b)
    if b == 0:
        assert result == 0
    else:
        assert result == pytest.approx(expected)


@pytest.mark.parametrize(
    "key,expected",
    [
        ("api_key", "sk-1234567890abcdef"),
        ("database_url", "postgresql://user:pass@localhost/db"),
    ],
)
def test_get_config_value_valid_keys(key, expected):
    """get_config_value returns values for known keys"""
    assert get_config_value(key) == expected


def test_get_config_value_unknown_key_raises():
    """get_config_value raises KeyError for unknown key"""
    with pytest.raises(KeyError):
        get_config_value("unknown")


def test_log_message_prints_prefix(capsys):
    """log_message prints with 'LOG: ' prefix"""
    log_message("hello world")
    captured = capsys.readouterr()
    assert "LOG: hello world" in captured.out


@pytest.mark.parametrize(
    "nums,expected",
    [
        ([1, 2, 3], 6),
        ([1.5, 2.5], 4.0),
        ([], 0),
    ],
)
def test_calculate_sum_values(nums, expected):
    """calculate_sum sums numbers in a list"""
    assert calculate_sum(nums) == expected


def test_find_duplicates_behavior():
    """find_duplicates returns repeated occurrences after first appearance"""
    items = [1, 2, 2, 3, 1, 2, 2]
    # duplicates are each repeat after first seen: 2 (second), 1 (second), 2 (third), 2 (fourth)
    assert find_duplicates(items) == [2, 1, 2, 2]


@pytest.mark.parametrize(
    "text,maxlen,expected",
    [
        ("hello", 10, "hello"),
        ("hello", 5, "hello"),
        ("hello world", 5, "hello"),
        ("", 0, ""),
    ],
)
def test_truncate_string_cases(text, maxlen, expected):
    """truncate_string returns original or truncated at max_length"""
    assert truncate_string(text, maxlen) == expected


def test_parse_date_valid():
    """parse_date splits 'YYYY-MM-DD' into ints"""
    assert parse_date("2020-01-05") == (2020, 1, 5)


def test_parse_date_invalid_format_raises_index_error():
    """parse_date with wrong delimiter raises IndexError due to missing parts"""
    with pytest.raises(IndexError):
        parse_date("2020/01/01")


def test_parse_date_non_integer_raises_value_error():
    """parse_date with non-integer parts raises ValueError"""
    with pytest.raises(ValueError):
        parse_date("20a0-01-01")