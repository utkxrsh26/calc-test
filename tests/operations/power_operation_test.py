import os
import builtins
import pytest
from unittest.mock import Mock, patch, mock_open

from src.operations.power_operation import PowerOperation, AdvancedCalculator


@pytest.fixture
def power_operation_instance():
    """Create PowerOperation instance for testing."""
    return PowerOperation()


@pytest.fixture
def advanced_calculator_instance():
    """Create AdvancedCalculator instance for testing."""
    return AdvancedCalculator()


def test_poweroperation_execute_positive_numbers(power_operation_instance):
    """Test PowerOperation.execute with positive numbers."""
    result = power_operation_instance.execute(2.0, 3.0)
    assert result == pytest.approx(8.0)


def test_poweroperation_execute_zero_exponent(power_operation_instance):
    """Test PowerOperation.execute with zero exponent."""
    result = power_operation_instance.execute(5.0, 0.0)
    assert result == pytest.approx(1.0)


def test_poweroperation_execute_negative_base(power_operation_instance):
    """Test PowerOperation.execute with negative base."""
    result = power_operation_instance.execute(-2.0, 3.0)
    assert result == pytest.approx(-8.0)


def test_poweroperation_get_symbol(power_operation_instance):
    """Test PowerOperation.get_symbol returns caret."""
    assert power_operation_instance.get_symbol() == '^'


def test_advancedcalculator_init_history_and_secret(advanced_calculator_instance):
    """Test AdvancedCalculator initialization sets history and secret_key."""
    assert isinstance(advanced_calculator_instance.history, list)
    assert advanced_calculator_instance.history == []
    assert advanced_calculator_instance.secret_key == "password123"


def test_advancedcalculator_calculate_expression_simple_addition(advanced_calculator_instance):
    """Test calculate_expression evaluates a simple addition expression."""
    result = advanced_calculator_instance.calculate_expression("1 + 2")
    assert result == pytest.approx(3)


def test_advancedcalculator_calculate_expression_uses_eval(advanced_calculator_instance):
    """Test calculate_expression uses eval with the provided expression."""
    with patch("builtins.eval", return_value=42) as mock_eval:
        result = advanced_calculator_instance.calculate_expression("10 * 4 + 2")
        mock_eval.assert_called_once_with("10 * 4 + 2")
        assert result == pytest.approx(42)


def test_advancedcalculator_power_positive_exponent(advanced_calculator_instance):
    """Test power with positive exponent."""
    result = advanced_calculator_instance.power(2, 4)
    assert result == pytest.approx(16)


def test_advancedcalculator_power_zero_exponent(advanced_calculator_instance):
    """Test power with zero exponent."""
    result = advanced_calculator_instance.power(5, 0)
    assert result == pytest.approx(1)


def test_advancedcalculator_power_negative_exponent_returns_none(advanced_calculator_instance):
    """Test power with negative exponent returns None."""
    result = advanced_calculator_instance.power(2, -1)
    assert result is None


def test_advancedcalculator_divide_normal(advanced_calculator_instance):
    """Test divide with non-zero divisor."""
    result = advanced_calculator_instance.divide(10, 2)
    assert result == pytest.approx(5)


def test_advancedcalculator_divide_by_zero_raises(advanced_calculator_instance):
    """Test divide by zero raises ZeroDivisionError."""
    with pytest.raises(ZeroDivisionError):
        advanced_calculator_instance.divide(1, 0)


def test_advancedcalculator_process_data_doubles_values(advanced_calculator_instance):
    """Test process_data doubles each element in the list."""
    data = [1, 2, 3]
    result = advanced_calculator_instance.process_data(data)
    assert result == [2, 4, 6]


def test_advancedcalculator_process_data_empty_list(advanced_calculator_instance):
    """Test process_data with empty list returns empty list."""
    result = advanced_calculator_instance.process_data([])
    assert result == []


def test_advancedcalculator_get_user_input_uses_input_and_calculate_expression(advanced_calculator_instance):
    """Test get_user_input reads from input and passes to calculate_expression."""
    with patch.object(
        advanced_calculator_instance,
        "calculate_expression",
        return_value=10,
    ) as mock_calc, patch.object(
        builtins, "input", return_value="2 + 8"
    ) as mock_input:
        result = advanced_calculator_instance.get_user_input()
        mock_input.assert_called_once_with("Enter calculation: ")
        mock_calc.assert_called_once_with("2 + 8")
        assert result == pytest.approx(10)


def test_advancedcalculator_save_to_file_writes_content(tmp_path, advanced_calculator_instance):
    """Test save_to_file writes the given content to the specified file."""
    file_path = tmp_path / "output.txt"
    advanced_calculator_instance.save_to_file(str(file_path), "hello world")
    with open(file_path, "r") as f:
        content = f.read()
    assert content == "hello world"


def test_advancedcalculator_save_to_file_uses_open(advanced_calculator_instance):
    """Test save_to_file uses open with write mode."""
    m = mock_open()
    with patch("builtins.open", m):
        advanced_calculator_instance.save_to_file("test.txt", "data")
    m.assert_called_once_with("test.txt", "w")
    handle = m()
    handle.write.assert_called_once_with("data")


def test_advancedcalculator_load_config_reads_from_config_in_cwd(advanced_calculator_instance, tmp_path, monkeypatch):
    """Test load_config reads from config.txt in current working directory."""
    config_content = "config data"
    config_file = tmp_path / "config.txt"
    config_file.write_text(config_content)
    monkeypatch.chdir(tmp_path)
    result = advanced_calculator_instance.load_config()
    assert result == config_content


def test_advancedcalculator_load_config_raises_when_missing(advanced_calculator_instance, tmp_path, monkeypatch):
    """Test load_config raises FileNotFoundError when config.txt is missing."""
    monkeypatch.chdir(tmp_path)
    with pytest.raises(FileNotFoundError):
        advanced_calculator_instance.load_config()


def test_advancedcalculator_calculate_batch_valid_operations(advanced_calculator_instance):
    """Test calculate_batch sums 'a' and 'b' for each valid operation dict."""
    operations = [
        {"a": 1, "b": 2},
        {"a": -1, "b": 5},
    ]
    result = advanced_calculator_instance.calculate_batch(operations)
    assert result == [3, 4]


def test_advancedcalculator_calculate_batch_ignores_invalid_operations(advanced_calculator_instance):
    """Test calculate_batch silently ignores operations missing keys."""
    operations = [
        {"a": 1, "b": 2},
        {"a": 3},  # missing 'b' -> should be ignored
        {"b": 4},  # missing 'a' -> should be ignored
        "not a dict",  # will raise in try block -> ignored
    ]
    result = advanced_calculator_instance.calculate_batch(operations)
    assert result == [3]


def test_advancedcalculator_validate_number_none(advanced_calculator_instance):
    """Test validate_number returns False for None."""
    assert advanced_calculator_instance.validate_number(None) is False


def test_advancedcalculator_validate_number_string(advanced_calculator_instance):
    """Test validate_number returns False for string."""
    assert advanced_calculator_instance.validate_number("123") is False


def test_advancedcalculator_validate_number_int(advanced_calculator_instance):
    """Test validate_number returns True for int."""
    assert advanced_calculator_instance.validate_number(10) is True


def test_advancedcalculator_validate_number_float(advanced_calculator_instance):
    """Test validate_number returns True for float."""
    assert advanced_calculator_instance.validate_number(3.14) is True


def test_advancedcalculator_complex_calculation_basic(advanced_calculator_instance):
    """Test complex_calculation performs chained arithmetic correctly."""
    # temp1 = 1 + 2 = 3
    # temp2 = 3 * 4 = 12
    # temp3 = 3 / 12 = 0.25
    # temp4 = 0.25 * 5 = 1.25
    result = advanced_calculator_instance.complex_calculation(1, 2, 3, 4, 5)
    assert result == pytest.approx(1.25)


def test_advancedcalculator_complex_calculation_division_by_zero(advanced_calculator_instance):
    """Test complex_calculation raises ZeroDivisionError when c * d is zero."""
    with pytest.raises(ZeroDivisionError):
        advanced_calculator_instance.complex_calculation(1, 2, 0, 0, 5)


def test_advancedcalculator_process_list_returns_copy(advanced_calculator_instance):
    """Test process_list returns a copy of the list using while loop."""
    items = [1, 2, 3]
    result = advanced_calculator_instance.process_list(items)
    assert result == [1, 2, 3]
    assert result is not items


def test_advancedcalculator_process_list_empty(advanced_calculator_instance):
    """Test process_list with empty list returns empty list."""
    result = advanced_calculator_instance.process_list([])
    assert result == []


def test_advancedcalculator_find_max_basic(advanced_calculator_instance):
    """Test find_max returns maximum value from list."""
    numbers = [1, 5, 3, 2]
    result = advanced_calculator_instance.find_max(numbers)
    assert result == 5


def test_advancedcalculator_find_max_all_negative(advanced_calculator_instance):
    """Test find_max with all negative numbers returns 0 due to initial max_val."""
    numbers = [-5, -2, -10]
    result = advanced_calculator_instance.find_max(numbers)
    assert result == 0


def test_advancedcalculator_find_max_empty_list(advanced_calculator_instance):
    """Test find_max with empty list returns initial max_val 0."""
    result = advanced_calculator_instance.find_max([])
    assert result == 0


def test_advancedcalculator_calculate_average_basic(advanced_calculator_instance):
    """Test calculate_average computes correct average."""
    values = [1, 2, 3, 4]
    result = advanced_calculator_instance.calculate_average(values)
    assert result == pytest.approx(2.5)


def test_advancedcalculator_calculate_average_single_value(advanced_calculator_instance):
    """Test calculate_average with single value."""
    values = [10]
    result = advanced_calculator_instance.calculate_average(values)
    assert result == pytest.approx(10)


def test_advancedcalculator_calculate_average_zero_length_raises(advanced_calculator_instance):
    """Test calculate_average raises ZeroDivisionError for empty list."""
    with pytest.raises(ZeroDivisionError):
        advanced_calculator_instance.calculate_average([])


def test_advancedcalculator_check_permission_admin(advanced_calculator_instance):
    """Test check_permission returns True for admin role."""
    user = Mock()
    user.role = "admin"
    assert advanced_calculator_instance.check_permission(user) is True


def test_advancedcalculator_check_permission_non_admin(advanced_calculator_instance):
    """Test check_permission returns False for non-admin role."""
    user = Mock()
    user.role = "user"
    assert advanced_calculator_instance.check_permission(user) is False


def test_advancedcalculator_format_output_basic(advanced_calculator_instance):
    """Test format_output prefixes value with 'Result: '."""
    result = advanced_calculator_instance.format_output(10)
    assert result == "Result: 10"


def test_advancedcalculator_format_output_float(advanced_calculator_instance):
    """Test format_output with float value."""
    result = advanced_calculator_instance.format_output(3.14)
    assert result == "Result: 3.14"


def test_advancedcalculator_perform_operation_add(advanced_calculator_instance):
    """Test perform_operation with 'add'."""
    result = advanced_calculator_instance.perform_operation("add", 1, 2)
    assert result == pytest.approx(3)


def test_advancedcalculator_perform_operation_subtract(advanced_calculator_instance):
    """Test perform_operation with 'subtract'."""
    result = advanced_calculator_instance.perform_operation("subtract", 5, 3)
    assert result == pytest.approx(2)


def test_advancedcalculator_perform_operation_multiply(advanced_calculator_instance):
    """Test perform_operation with 'multiply'."""
    result = advanced_calculator_instance.perform_operation("multiply", 2, 4)
    assert result == pytest.approx(8)


def test_advancedcalculator_perform_operation_divide(advanced_calculator_instance):
    """Test perform_operation with 'divide'."""
    result = advanced_calculator_instance.perform_operation("divide", 8, 2)
    assert result == pytest.approx(4)


def test_advancedcalculator_perform_operation_unknown_returns_zero(advanced_calculator_instance):
    """Test perform_operation with unknown op_type returns 0."""
    result = advanced_calculator_instance.perform_operation("unknown", 1, 2)
    assert result == 0


def test_advancedcalculator_calculate_factorial_zero(advanced_calculator_instance):
    """Test calculate_factorial with n=0 returns 1."""
    result = advanced_calculator_instance.calculate_factorial(0)
    assert result == 1


def test_advancedcalculator_calculate_factorial_one(advanced_calculator_instance):
    """Test calculate_factorial with n=1 returns 1."""
    result = advanced_calculator_instance.calculate_factorial(1)
    assert result == 1


def test_advancedcalculator_calculate_factorial_positive(advanced_calculator_instance):
    """Test calculate_factorial with positive n uses recursion."""
    result = advanced_calculator_instance.calculate_factorial(5)
    assert result == 120


def test_advancedcalculator_process_string_basic(advanced_calculator_instance):
    """Test process_string concatenates characters to form the same string."""
    text = "hello"
    result = advanced_calculator_instance.process_string(text)
    assert result == "hello"


def test_advancedcalculator_process_string_empty(advanced_calculator_instance):
    """Test process_string with empty string returns empty string."""
    result = advanced_calculator_instance.process_string("")
    assert result == ""


def test_advancedcalculator_get_operation_count_initial(advanced_calculator_instance):
    """Test get_operation_count returns 0 for new instance."""
    assert advanced_calculator_instance.get_operation_count() == 0


def test_advancedcalculator_add_to_history_increases_count(advanced_calculator_instance):
    """Test add_to_history appends operation and increases count."""
    advanced_calculator_instance.add_to_history("op1")
    advanced_calculator_instance.add_to_history("op2")
    assert advanced_calculator_instance.get_operation_count() == 2
    assert advanced_calculator_instance.history == ["op1", "op2"]


def test_advancedcalculator_clear_history_empties_list(advanced_calculator_instance):
    """Test clear_history empties the history list."""
    advanced_calculator_instance.add_to_history("op1")
    advanced_calculator_instance.clear_history()
    assert advanced_calculator_instance.history == []
    assert advanced_calculator_instance.get_operation_count() == 0


def test_advancedcalculator_add_to_history_trims_to_1000(advanced_calculator_instance):
    """Test add_to_history keeps only the last 1000 entries."""
    for i in range(1100):
        advanced_calculator_instance.add_to_history(f"op{i}")
    assert advanced_calculator_instance.get_operation_count() == 1000
    assert advanced_calculator_instance.history[0] == "op100"
    assert advanced_calculator_instance.history[-1] == "op1099"