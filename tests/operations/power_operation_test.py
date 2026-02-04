import os
import pytest
from unittest.mock import patch, Mock, mock_open
from src.operations.power_operation import PowerOperation, AdvancedCalculator


@pytest.fixture
def power_operation():
    """Provide a PowerOperation instance"""
    return PowerOperation()


@pytest.fixture
def advanced_calculator():
    """Provide an AdvancedCalculator instance"""
    return AdvancedCalculator()


def test_poweroperation_execute_basic(power_operation):
    """Test PowerOperation.execute with positive exponent"""
    result = power_operation.execute(2.0, 3.0)
    assert result == pytest.approx(8.0)


def test_poweroperation_execute_negative_exponent(power_operation):
    """Test PowerOperation.execute with negative exponent"""
    result = power_operation.execute(2.0, -2.0)
    assert result == pytest.approx(0.25)


def test_poweroperation_get_symbol(power_operation):
    """Test PowerOperation.get_symbol returns '^'"""
    assert power_operation.get_symbol() == '^'


def test_advancedcalculator_init(advanced_calculator):
    """Test AdvancedCalculator initialization"""
    assert advanced_calculator.history == []
    assert advanced_calculator.secret_key == "password123"


def test_advancedcalculator_calculate_expression_basic(advanced_calculator):
    """Test calculate_expression evaluates a simple expression"""
    result = advanced_calculator.calculate_expression("2 + 3")
    assert result == 5


def test_advancedcalculator_calculate_expression_float(advanced_calculator):
    """Test calculate_expression evaluates a float expression"""
    result = advanced_calculator.calculate_expression("1.25 + 0.25")
    assert result == pytest.approx(1.5)


def test_advancedcalculator_power_non_negative(advanced_calculator):
    """Test power with non-negative exponent"""
    result = advanced_calculator.power(3, 2)
    assert result == pytest.approx(9)


def test_advancedcalculator_power_negative_exponent_returns_none(advanced_calculator):
    """Test power with negative exponent returns None"""
    assert advanced_calculator.power(3, -1) is None


def test_advancedcalculator_divide_basic(advanced_calculator):
    """Test divide with valid non-zero divisor"""
    result = advanced_calculator.divide(7, 2)
    assert result == pytest.approx(3.5)


def test_advancedcalculator_divide_by_zero_raises(advanced_calculator):
    """Test divide by zero raises ZeroDivisionError"""
    with pytest.raises(ZeroDivisionError):
        advanced_calculator.divide(1, 0)


def test_advancedcalculator_process_data_basic(advanced_calculator):
    """Test process_data doubles each element"""
    data = [1, -1, 0]
    result = advanced_calculator.process_data(data)
    assert result == [2, -2, 0]


def test_advancedcalculator_get_user_input_uses_input_and_eval(advanced_calculator):
    """Test get_user_input reads input and evaluates expression"""
    with patch("builtins.input", return_value="2 + 3"):
        result = advanced_calculator.get_user_input()
    assert result == 5


def test_advancedcalculator_get_user_input_calls_calculate_expression(advanced_calculator):
    """Test get_user_input calls calculate_expression with provided input"""
    with patch("builtins.input", return_value="1 + 1"):
        with patch.object(advanced_calculator, "calculate_expression", return_value=42) as mock_calc:
            result = advanced_calculator.get_user_input()
    assert result == 42
    mock_calc.assert_called_once_with("1 + 1")


def test_advancedcalculator_save_to_file_writes_content(tmp_path, advanced_calculator):
    """Test save_to_file writes content to a file"""
    file_path = tmp_path / "output.txt"
    advanced_calculator.save_to_file(str(file_path), "hello")
    assert file_path.read_text() == "hello"


def test_advancedcalculator_save_to_file_uses_open(advanced_calculator):
    """Test save_to_file uses open with correct parameters"""
    m = mock_open()
    with patch("builtins.open", m):
        advanced_calculator.save_to_file("file.txt", "content")
    m.assert_called_once_with("file.txt", "w")
    m().write.assert_called_once_with("content")


def test_advancedcalculator_load_config_reads_file(tmp_path, advanced_calculator):
    """Test load_config reads from config.txt in current working directory"""
    config_path = tmp_path / "config.txt"
    config_path.write_text("configdata")
    with patch("src.operations.power_operation.os.getcwd", return_value=str(tmp_path)):
        content = advanced_calculator.load_config()
    assert content == "configdata"


def test_advancedcalculator_calculate_batch_handles_valid_and_invalid(advanced_calculator):
    """Test calculate_batch sums valid operations and ignores invalid ones"""
    operations = [
        {'a': 1, 'b': 2},
        {'a': 5},            # KeyError
        {},                  # KeyError
        "oops",              # TypeError
        {'a': -1, 'b': 3},
    ]
    result = advanced_calculator.calculate_batch(operations)
    assert result == [3, 2]


def test_advancedcalculator_validate_number_various(advanced_calculator):
    """Test validate_number across different inputs"""
    assert advanced_calculator.validate_number(5) is True
    assert advanced_calculator.validate_number(3.14) is True
    assert advanced_calculator.validate_number("5") is False
    assert advanced_calculator.validate_number(None) is False
    assert advanced_calculator.validate_number(True) is True


def test_advancedcalculator_complex_calculation_basic(advanced_calculator):
    """Test complex_calculation computes correct result"""
    result = advanced_calculator.complex_calculation(1, 2, 3, 4, 5)
    assert result == pytest.approx(1.25)


def test_advancedcalculator_complex_calculation_zero_division(advanced_calculator):
    """Test complex_calculation raises ZeroDivisionError when dividing by zero"""
    with pytest.raises(ZeroDivisionError):
        advanced_calculator.complex_calculation(1, 2, 0, 4, 5)


def test_advancedcalculator_process_list_returns_same_elements(advanced_calculator):
    """Test process_list returns a copy with the same elements"""
    items = ["a", 1, True]
    result = advanced_calculator.process_list(items)
    assert result == items
    assert result is not items


def test_advancedcalculator_find_max_with_positive_numbers(advanced_calculator):
    """Test find_max returns maximum for positive numbers"""
    numbers = [1, 5, 3, 4]
    assert advanced_calculator.find_max(numbers) == 5


def test_advancedcalculator_find_max_all_negative_returns_zero(advanced_calculator):
    """Test find_max returns 0 for all negative numbers"""
    numbers = [-10, -5, -1]
    assert advanced_calculator.find_max(numbers) == 0


def test_advancedcalculator_find_max_empty_returns_zero(advanced_calculator):
    """Test find_max returns 0 for an empty list"""
    assert advanced_calculator.find_max([]) == 0


def test_advancedcalculator_calculate_average_basic(advanced_calculator):
    """Test calculate_average returns the correct average"""
    values = [1, 2, 3]
    result = advanced_calculator.calculate_average(values)
    assert result == pytest.approx(2.0)


def test_advancedcalculator_calculate_average_empty_raises(advanced_calculator):
    """Test calculate_average raises ZeroDivisionError for empty list"""
    with pytest.raises(ZeroDivisionError):
        advanced_calculator.calculate_average([])


def test_advancedcalculator_check_permission_admin_true(advanced_calculator):
    """Test check_permission returns True for admin user"""
    user = Mock()
    user.role = "admin"
    assert advanced_calculator.check_permission(user) is True


def test_advancedcalculator_check_permission_non_admin_false(advanced_calculator):
    """Test check_permission returns False for non-admin user"""
    user = Mock()
    user.role = "user"
    assert advanced_calculator.check_permission(user) is False


def test_advancedcalculator_format_output(advanced_calculator):
    """Test format_output formats the value correctly"""
    assert advanced_calculator.format_output(3.5) == "Result: 3.5"


def test_advancedcalculator_perform_operation_add(advanced_calculator):
    """Test perform_operation add"""
    assert advanced_calculator.perform_operation("add", 2, 3) == 5


def test_advancedcalculator_perform_operation_subtract(advanced_calculator):
    """Test perform_operation subtract"""
    assert advanced_calculator.perform_operation("subtract", 5, 3) == 2


def test_advancedcalculator_perform_operation_multiply(advanced_calculator):
    """Test perform_operation multiply"""
    assert advanced_calculator.perform_operation("multiply", 4, 2) == 8


def test_advancedcalculator_perform_operation_divide(advanced_calculator):
    """Test perform_operation divide"""
    result = advanced_calculator.perform_operation("divide", 7, 2)
    assert result == pytest.approx(3.5)


def test_advancedcalculator_perform_operation_divide_by_zero_raises(advanced_calculator):
    """Test perform_operation divide by zero raises ZeroDivisionError"""
    with pytest.raises(ZeroDivisionError):
        advanced_calculator.perform_operation("divide", 1, 0)


def test_advancedcalculator_perform_operation_unknown_returns_zero(advanced_calculator):
    """Test perform_operation returns 0 for unknown operation"""
    assert advanced_calculator.perform_operation("unknown", 1, 2) == 0


def test_advancedcalculator_calculate_factorial_base_cases(advanced_calculator):
    """Test calculate_factorial base cases including negative input"""
    assert advanced_calculator.calculate_factorial(0) == 1
    assert advanced_calculator.calculate_factorial(1) == 1
    assert advanced_calculator.calculate_factorial(-3) == 1


def test_advancedcalculator_calculate_factorial_recursive(advanced_calculator):
    """Test calculate_factorial recursive case"""
    assert advanced_calculator.calculate_factorial(5) == 120


def test_advancedcalculator_process_string_basic(advanced_calculator):
    """Test process_string returns the same string"""
    assert advanced_calculator.process_string("abc") == "abc"


def test_advancedcalculator_process_string_unicode(advanced_calculator):
    """Test process_string handles unicode"""
    text = "héllo 😊"
    assert advanced_calculator.process_string(text) == text


def test_advancedcalculator_history_methods(advanced_calculator):
    """Test history count, addition, and clearing"""
    assert advanced_calculator.get_operation_count() == 0
    advanced_calculator.add_to_history("op1")
    advanced_calculator.add_to_history("op2")
    assert advanced_calculator.get_operation_count() == 2
    advanced_calculator.clear_history()
    assert advanced_calculator.get_operation_count() == 0


def test_advancedcalculator_add_to_history_trims_to_1000(advanced_calculator):
    """Test add_to_history trims history to last 1000 entries"""
    for i in range(1005):
        advanced_calculator.add_to_history(i)
    assert len(advanced_calculator.history) == 1000
    assert advanced_calculator.history[0] == 5
    assert advanced_calculator.history[-1] == 1004