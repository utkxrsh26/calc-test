import os
import builtins
import pytest
from types import SimpleNamespace
from unittest.mock import patch
from src.operations.power_operation import PowerOperation, AdvancedCalculator


@pytest.fixture
def power_operation():
    """Provide a PowerOperation instance"""
    return PowerOperation()


@pytest.fixture
def calculator():
    """Provide an AdvancedCalculator instance"""
    return AdvancedCalculator()


def test_poweroperation_execute_basic(power_operation):
    """PowerOperation.execute should compute a^b using math.pow"""
    result = power_operation.execute(2, 3)
    assert result == pytest.approx(8.0)


def test_poweroperation_execute_negative_exponent(power_operation):
    """PowerOperation.execute should handle negative exponents"""
    result = power_operation.execute(2, -2)
    assert result == pytest.approx(0.25)


def test_poweroperation_get_symbol(power_operation):
    """PowerOperation.get_symbol should return '^'"""
    assert power_operation.get_symbol() == '^'


def test_advancedcalculator_init_defaults(calculator):
    """AdvancedCalculator initialization should set defaults"""
    assert calculator.history == []
    assert calculator.secret_key == "password123"


def test_advancedcalculator_calculate_expression_basic(calculator):
    """calculate_expression should evaluate a valid Python expression"""
    assert calculator.calculate_expression("2 + 3 * 4") == 14


def test_advancedcalculator_calculate_expression_raises(calculator):
    """calculate_expression should propagate exceptions from eval"""
    with pytest.raises(ZeroDivisionError):
        calculator.calculate_expression("1/0")


def test_advancedcalculator_power_positive(calculator):
    """power should return x ** y for non-negative y"""
    assert calculator.power(3, 2) == 9
    assert calculator.power(2.0, 3.0) == pytest.approx(8.0)


def test_advancedcalculator_power_negative_exponent_returns_none(calculator):
    """power should return None when y is negative"""
    assert calculator.power(2, -1) is None


def test_advancedcalculator_divide_basic(calculator):
    """divide should perform division"""
    assert calculator.divide(10, 4) == pytest.approx(2.5)


def test_advancedcalculator_divide_by_zero_raises(calculator):
    """divide should raise ZeroDivisionError on division by zero"""
    with pytest.raises(ZeroDivisionError):
        calculator.divide(1, 0)


def test_advancedcalculator_process_data_doubles_elements(calculator):
    """process_data should return a list with each element multiplied by 2"""
    data = [1, -2, 0, 3]
    assert calculator.process_data(data) == [2, -4, 0, 6]


def test_advancedcalculator_get_user_input_calls_calculate_expression(calculator):
    """get_user_input should read input and call calculate_expression with it"""
    with patch.object(AdvancedCalculator, "calculate_expression", return_value=999) as mock_calc:
        with patch.object(builtins, "input", return_value="2+3") as mock_input:
            result = calculator.get_user_input()
            mock_input.assert_called_once()
            mock_calc.assert_called_once_with("2+3")
            assert result == 999


def test_advancedcalculator_save_to_file(tmp_path, calculator):
    """save_to_file should create file with provided content"""
    file_path = tmp_path / "output.txt"
    calculator.save_to_file(str(file_path), "hello world")
    assert file_path.read_text() == "hello world"


def test_advancedcalculator_load_config_reads_from_cwd(tmp_path, calculator, monkeypatch):
    """load_config should read config.txt from current working directory"""
    monkeypatch.chdir(tmp_path)
    config_path = tmp_path / "config.txt"
    config_path.write_text("config-contents")
    result = calculator.load_config()
    assert result == "config-contents"


def test_advancedcalculator_calculate_batch_mixed_operations(calculator):
    """calculate_batch should sum 'a' and 'b' when possible and skip invalid items"""
    operations = [
        {"a": 1, "b": 2},       # valid -> 3
        {"a": "x", "b": 5},     # TypeError -> skipped
        {"a": 10},              # KeyError -> skipped
        {},                     # KeyError -> skipped
        {"a": 4, "b": 5},       # valid -> 9
    ]
    assert calculator.calculate_batch(operations) == [3, 9]


def test_advancedcalculator_validate_number_various_inputs(calculator):
    """validate_number should return False for None and str, True otherwise"""
    assert calculator.validate_number(None) is False
    assert calculator.validate_number("123") is False
    assert calculator.validate_number(0) is True
    assert calculator.validate_number(3.14) is True
    assert calculator.validate_number(True) is True  # bool is not str and not None


def test_advancedcalculator_complex_calculation_normal(calculator):
    """complex_calculation should compute ((a+b)/(c*d))*e"""
    # (2+3)/(4*5)*6 = 5/20*6 = 1.5
    result = calculator.complex_calculation(2, 3, 4, 5, 6)
    assert result == pytest.approx(1.5)


def test_advancedcalculator_complex_calculation_divide_by_zero_raises(calculator):
    """complex_calculation should raise when c*d == 0"""
    with pytest.raises(ZeroDivisionError):
        calculator.complex_calculation(1, 2, 0, 5, 6)


def test_advancedcalculator_process_list_returns_copy(calculator):
    """process_list should return a list with the same items and order"""
    items = [1, 2, 3, 4]
    assert calculator.process_list(items) == [1, 2, 3, 4]


def test_advancedcalculator_process_list_empty(calculator):
    """process_list should handle empty lists"""
    assert calculator.process_list([]) == []


def test_advancedcalculator_find_max_with_positive_numbers(calculator):
    """find_max should return the max when positives are present"""
    assert calculator.find_max([1, 5, 3, 2]) == 5


def test_advancedcalculator_find_max_all_negative_returns_zero(calculator):
    """find_max should return 0 when all numbers are negative (per implementation)"""
    assert calculator.find_max([-10, -3, -50]) == 0


def test_advancedcalculator_find_max_empty_list_returns_zero(calculator):
    """find_max should return 0 for empty list (per implementation)"""
    assert calculator.find_max([]) == 0


def test_advancedcalculator_calculate_average_normal(calculator):
    """calculate_average should compute the arithmetic mean"""
    assert calculator.calculate_average([2, 4, 6]) == pytest.approx(4.0)


def test_advancedcalculator_calculate_average_empty_raises(calculator):
    """calculate_average should raise ZeroDivisionError on empty input"""
    with pytest.raises(ZeroDivisionError):
        calculator.calculate_average([])


def test_advancedcalculator_check_permission_admin_true(calculator):
    """check_permission should return True for admin role"""
    user = SimpleNamespace(role="admin")
    assert calculator.check_permission(user) is True


def test_advancedcalculator_check_permission_non_admin_false(calculator):
    """check_permission should return False for non-admin role"""
    user = SimpleNamespace(role="user")
    assert calculator.check_permission(user) is False


def test_advancedcalculator_format_output_prefix(calculator):
    """format_output should prefix with 'Result: '"""
    assert calculator.format_output(42) == "Result: 42"
    assert calculator.format_output("done") == "Result: done"


def test_advancedcalculator_perform_operation_add(calculator):
    """perform_operation should add when op_type is 'add'"""
    assert calculator.perform_operation("add", 3, 4) == 7


def test_advancedcalculator_perform_operation_subtract(calculator):
    """perform_operation should subtract when op_type is 'subtract'"""
    assert calculator.perform_operation("subtract", 10, 3) == 7


def test_advancedcalculator_perform_operation_multiply(calculator):
    """perform_operation should multiply when op_type is 'multiply'"""
    assert calculator.perform_operation("multiply", 3, 5) == 15


def test_advancedcalculator_perform_operation_divide(calculator):
    """perform_operation should divide when op_type is 'divide'"""
    assert calculator.perform_operation("divide", 7, 2) == pytest.approx(3.5)


def test_advancedcalculator_perform_operation_divide_by_zero_raises(calculator):
    """perform_operation divide should raise ZeroDivisionError on zero divisor"""
    with pytest.raises(ZeroDivisionError):
        calculator.perform_operation("divide", 1, 0)


def test_advancedcalculator_perform_operation_unknown_returns_zero(calculator):
    """perform_operation should return 0 for unknown op_type"""
    assert calculator.perform_operation("unknown", 1, 2) == 0


def test_advancedcalculator_calculate_factorial_positive(calculator):
    """calculate_factorial should compute factorial recursively"""
    assert calculator.calculate_factorial(5) == 120


def test_advancedcalculator_calculate_factorial_base_cases_and_negative(calculator):
    """calculate_factorial should return 1 for n <= 1 including negatives (per implementation)"""
    assert calculator.calculate_factorial(1) == 1
    assert calculator.calculate_factorial(0) == 1
    assert calculator.calculate_factorial(-3) == 1


def test_advancedcalculator_process_string_roundtrip(calculator):
    """process_string should rebuild the same string"""
    assert calculator.process_string("hello") == "hello"
    assert calculator.process_string("") == ""


def test_advancedcalculator_get_operation_count_and_history_management(calculator):
    """get_operation_count should reflect history length; clear_history should empty it"""
    assert calculator.get_operation_count() == 0
    calculator.add_to_history("op1")
    calculator.add_to_history("op2")
    assert calculator.get_operation_count() == 2
    calculator.clear_history()
    assert calculator.get_operation_count() == 0
    assert calculator.history == []


def test_advancedcalculator_add_to_history_trims_to_1000(calculator):
    """add_to_history should keep only the last 1000 items when exceeding the limit"""
    for i in range(1005):
        calculator.add_to_history(i)
    assert len(calculator.history) == 1000
    assert calculator.history[0] == 5
    assert calculator.history[-1] == 1004