import os
import pytest
from types import SimpleNamespace
from unittest.mock import patch

from src.operations.power_operation import PowerOperation, AdvancedCalculator


@pytest.fixture
def power_operation():
    """Create PowerOperation instance for testing"""
    return PowerOperation()


@pytest.fixture
def calculator():
    """Create AdvancedCalculator instance for testing"""
    return AdvancedCalculator()


def test_poweroperation_execute_basic(power_operation):
    """Test PowerOperation.execute with basic positive integers"""
    result = power_operation.execute(2, 3)
    assert result == pytest.approx(8.0)


def test_poweroperation_execute_zero_exponent(power_operation):
    """Test PowerOperation.execute with zero exponent"""
    result = power_operation.execute(5, 0)
    assert result == pytest.approx(1.0)


def test_poweroperation_get_symbol(power_operation):
    """Test PowerOperation.get_symbol returns '^'"""
    assert power_operation.get_symbol() == '^'


def test_advancedcalculator_init_defaults(calculator):
    """Test AdvancedCalculator initialization defaults"""
    assert calculator.history == []
    assert calculator.secret_key == "password123"


def test_advancedcalculator_calculate_expression_valid(calculator):
    """Test calculate_expression evaluates a valid arithmetic expression"""
    expr = "2 + 3 * 4"
    result = calculator.calculate_expression(expr)
    assert result == 14


def test_advancedcalculator_calculate_expression_invalid_raises(calculator):
    """Test calculate_expression raises SyntaxError for invalid expression"""
    with pytest.raises(SyntaxError):
        calculator.calculate_expression("2 +")


def test_advancedcalculator_power_positive(calculator):
    """Test power method with positive exponent"""
    assert calculator.power(2, 3) == 8


def test_advancedcalculator_power_zero(calculator):
    """Test power method with zero exponent returns 1"""
    assert calculator.power(7, 0) == 1


def test_advancedcalculator_power_negative_exponent(calculator):
    """Test power method returns None for negative exponent"""
    assert calculator.power(2, -1) is None


def test_advancedcalculator_divide_normal(calculator):
    """Test divide method with non-zero divisor"""
    result = calculator.divide(7, 2)
    assert result == pytest.approx(3.5)


def test_advancedcalculator_divide_by_zero_raises(calculator):
    """Test divide method raises ZeroDivisionError for division by zero"""
    with pytest.raises(ZeroDivisionError):
        calculator.divide(1, 0)


def test_advancedcalculator_process_data_numbers(calculator):
    """Test process_data doubles numeric list elements"""
    assert calculator.process_data([1, 2, 3]) == [2, 4, 6]


def test_advancedcalculator_process_data_empty(calculator):
    """Test process_data with empty list returns empty list"""
    assert calculator.process_data([]) == []


def test_advancedcalculator_get_user_input_calls_calculate_expression(calculator):
    """Test get_user_input uses input and calculate_expression"""
    with patch("builtins.input", return_value="2+2") as mock_input, \
         patch.object(calculator, "calculate_expression", return_value=999) as mock_calc:
        result = calculator.get_user_input()
        mock_input.assert_called_once_with("Enter calculation: ")
        mock_calc.assert_called_once_with("2+2")
        assert result == 999


def test_advancedcalculator_get_user_input_propagates_exception(calculator):
    """Test get_user_input propagates exceptions from calculate_expression"""
    with patch("builtins.input", return_value="bad expr"), \
         patch.object(calculator, "calculate_expression", side_effect=ValueError("bad")):
        with pytest.raises(ValueError):
            calculator.get_user_input()


def test_advancedcalculator_save_to_file(tmp_path, calculator):
    """Test save_to_file writes correct content to file"""
    file_path = tmp_path / "output.txt"
    calculator.save_to_file(str(file_path), "hello world")
    assert file_path.read_text() == "hello world"


def test_advancedcalculator_load_config_reads_file(tmp_path, calculator):
    """Test load_config reads content from config.txt in current working directory"""
    cfg_path = tmp_path / "config.txt"
    cfg_path.write_text("config-content")
    with patch("os.getcwd", return_value=str(tmp_path)):
        content = calculator.load_config()
        assert content == "config-content"


def test_advancedcalculator_load_config_missing_raises(calculator, tmp_path):
    """Test load_config raises FileNotFoundError if config.txt is missing"""
    with patch("os.getcwd", return_value=str(tmp_path)):
        with pytest.raises(FileNotFoundError):
            calculator.load_config()


def test_advancedcalculator_calculate_batch_mixed(calculator):
    """Test calculate_batch processes valid ops and skips invalid ones"""
    operations = [
        {'a': 1, 'b': 2},
        {'a': '1', 'b': 2},   # TypeError -> skipped
        {'a': 3},             # KeyError -> skipped
        {'a': 1.5, 'b': 2.5}
    ]
    results = calculator.calculate_batch(operations)
    assert len(results) == 2
    assert results[0] == 3
    assert results[1] == pytest.approx(4.0)


def test_advancedcalculator_calculate_batch_empty(calculator):
    """Test calculate_batch with empty list returns empty results"""
    assert calculator.calculate_batch([]) == []


def test_advancedcalculator_validate_number_various(calculator):
    """Test validate_number with None, string, ints, floats, and bool"""
    assert calculator.validate_number(None) is False
    assert calculator.validate_number("123") is False
    assert calculator.validate_number(0) is True
    assert calculator.validate_number(3.14) is True
    assert calculator.validate_number(True) is True


def test_advancedcalculator_complex_calculation(calculator):
    """Test complex_calculation returns correct computed float value"""
    result = calculator.complex_calculation(2, 3, 4, 5, 6)
    assert result == pytest.approx(1.5)


def test_advancedcalculator_process_list_returns_copy(calculator):
    """Test process_list returns a new list with same items"""
    items = [1, 2, 3]
    output = calculator.process_list(items)
    assert output == items
    assert output is not items


def test_advancedcalculator_process_list_empty(calculator):
    """Test process_list with empty list"""
    assert calculator.process_list([]) == []


def test_advancedcalculator_find_max_mixed(calculator):
    """Test find_max returns maximum among mixed values"""
    numbers = [-5, -1, 0, 2, 10, 3]
    assert calculator.find_max(numbers) == 10


def test_advancedcalculator_find_max_all_negative_returns_zero(calculator):
    """Test find_max returns 0 when all numbers are negative"""
    assert calculator.find_max([-5, -2, -10]) == 0


def test_advancedcalculator_calculate_average_normal(calculator):
    """Test calculate_average returns correct average"""
    result = calculator.calculate_average([1, 2, 3, 4])
    assert result == pytest.approx(2.5)


def test_advancedcalculator_calculate_average_empty_raises(calculator):
    """Test calculate_average raises ZeroDivisionError for empty list"""
    with pytest.raises(ZeroDivisionError):
        calculator.calculate_average([])


def test_advancedcalculator_check_permission_admin(calculator):
    """Test check_permission returns True for admin user"""
    user = SimpleNamespace(role="admin")
    assert calculator.check_permission(user) is True


def test_advancedcalculator_check_permission_non_admin(calculator):
    """Test check_permission returns False for non-admin user"""
    user = SimpleNamespace(role="user")
    assert calculator.check_permission(user) is False


def test_advancedcalculator_format_output_various(calculator):
    """Test format_output formats different types"""
    assert calculator.format_output(10) == "Result: 10"
    assert calculator.format_output("hello") == "Result: hello"


def test_advancedcalculator_perform_operation_add_sub_mul_div(calculator):
    """Test perform_operation for basic arithmetic operations"""
    assert calculator.perform_operation("add", 2, 3) == 5
    assert calculator.perform_operation("subtract", 5, 2) == 3
    assert calculator.perform_operation("multiply", 4, 3) == 12
    assert calculator.perform_operation("divide", 7, 2) == pytest.approx(3.5)


def test_advancedcalculator_perform_operation_divide_by_zero_raises(calculator):
    """Test perform_operation divide raises ZeroDivisionError for zero divisor"""
    with pytest.raises(ZeroDivisionError):
        calculator.perform_operation("divide", 1, 0)


def test_advancedcalculator_perform_operation_unknown(calculator):
    """Test perform_operation returns 0 for unknown operation type"""
    assert calculator.perform_operation("unknown", 1, 2) == 0


def test_advancedcalculator_calculate_factorial_base_cases(calculator):
    """Test calculate_factorial with base cases 0 and 1"""
    assert calculator.calculate_factorial(0) == 1
    assert calculator.calculate_factorial(1) == 1


def test_advancedcalculator_calculate_factorial_positive(calculator):
    """Test calculate_factorial with positive integer"""
    assert calculator.calculate_factorial(5) == 120


def test_advancedcalculator_calculate_factorial_negative(calculator):
    """Test calculate_factorial returns 1 for negative inputs (as implemented)"""
    assert calculator.calculate_factorial(-3) == 1


def test_advancedcalculator_process_string(calculator):
    """Test process_string returns the same string"""
    assert calculator.process_string("abc") == "abc"
    assert calculator.process_string("") == ""


def test_advancedcalculator_history_methods(calculator):
    """Test history-related methods: add_to_history, get_operation_count, clear_history"""
    assert calculator.get_operation_count() == 0
    calculator.add_to_history("op1")
    calculator.add_to_history("op2")
    assert calculator.history == ["op1", "op2"]
    assert calculator.get_operation_count() == 2
    calculator.clear_history()
    assert calculator.history == []
    assert calculator.get_operation_count() == 0


def test_advancedcalculator_add_to_history_trims_to_1000(calculator):
    """Test add_to_history trims history to last 1000 entries"""
    for i in range(1005):
        calculator.add_to_history(f"op_{i}")
    assert calculator.get_operation_count() == 1000
    assert calculator.history[0] == "op_5"
    assert calculator.history[-1] == "op_1004"