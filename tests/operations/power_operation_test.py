import sys
import types
import pytest
from unittest.mock import patch, Mock

# Ensure dependency stub for src.operations.operation.Operation if missing
if "src.operations.operation" not in sys.modules:
    pkg_src = sys.modules.setdefault("src", types.ModuleType("src"))
    pkg_ops = sys.modules.setdefault("src.operations", types.ModuleType("src.operations"))
    mod_operation = types.ModuleType("src.operations.operation")
    class _StubOperation:
        pass
    mod_operation.Operation = _StubOperation
    sys.modules["src.operations.operation"] = mod_operation

from src.operations.power_operation import PowerOperation, AdvancedCalculator


@pytest.fixture
def power_operation():
    """Create a PowerOperation instance for testing"""
    return PowerOperation()


@pytest.fixture
def calculator():
    """Create an AdvancedCalculator instance for testing"""
    return AdvancedCalculator()


def test_poweroperation_execute_basic(power_operation):
    """Test PowerOperation.execute computes power using math.pow"""
    result = power_operation.execute(2, 3)
    assert result == pytest.approx(8.0)


def test_poweroperation_get_symbol(power_operation):
    """Test PowerOperation.get_symbol returns caret '^'"""
    assert power_operation.get_symbol() == '^'


def test_advancedcalculator_init_defaults(calculator):
    """Test AdvancedCalculator initialization sets defaults"""
    assert calculator.history == []
    assert calculator.secret_key == "password123"


def test_advancedcalculator_calculate_expression_basic(calculator):
    """Test calculate_expression evaluates a simple arithmetic expression"""
    assert calculator.calculate_expression("2 + 3 * 4") == 14


def test_advancedcalculator_calculate_expression_math_context(calculator):
    """Test calculate_expression can access math module from global scope"""
    result = calculator.calculate_expression("math.sqrt(16)")
    assert result == pytest.approx(4.0)


def test_advancedcalculator_power_positive(calculator):
    """Test power returns x ** y for non-negative exponents"""
    assert calculator.power(3, 4) == 81
    assert calculator.power(5, 0) == 1


def test_advancedcalculator_power_negative_returns_none(calculator):
    """Test power returns None for negative exponents"""
    assert calculator.power(2, -1) is None


def test_advancedcalculator_divide_basic(calculator):
    """Test divide performs floating-point division"""
    result = calculator.divide(7, 2)
    assert result == pytest.approx(3.5)


def test_advancedcalculator_divide_by_zero_raises(calculator):
    """Test divide raises ZeroDivisionError when dividing by zero"""
    with pytest.raises(ZeroDivisionError):
        calculator.divide(1, 0)


def test_advancedcalculator_process_data_mixed_types(calculator):
    """Test process_data doubles each element of the input list"""
    data = [1, 2, "a", 0]
    result = calculator.process_data(data)
    assert result == [2, 4, "aa", 0]


def test_advancedcalculator_get_user_input_uses_input_and_evaluates(calculator):
    """Test get_user_input reads from input and delegates to calculate_expression"""
    with patch("builtins.input", return_value="2+3"), \
         patch.object(calculator, "calculate_expression", return_value=42) as mock_calc:
        result = calculator.get_user_input()
        assert result == 42
        mock_calc.assert_called_once_with("2+3")


def test_advancedcalculator_save_to_file_writes_content(calculator, tmp_path):
    """Test save_to_file writes the provided content to the given file"""
    file_path = tmp_path / "out.txt"
    calculator.save_to_file(str(file_path), "hello world")
    assert file_path.read_text() == "hello world"


def test_advancedcalculator_load_config_reads_file(calculator, tmp_path):
    """Test load_config reads config.txt from current working directory"""
    config_file = tmp_path / "config.txt"
    config_file.write_text("config-contents")
    with patch("src.operations.power_operation.os.getcwd", return_value=str(tmp_path)):
        result = calculator.load_config()
    assert result == "config-contents"


def test_advancedcalculator_calculate_batch_handles_errors(calculator):
    """Test calculate_batch sums valid operations and skips invalid ones"""
    operations = [
        {"a": 1, "b": 2},
        {"a": 10, "b": -5},
        {"a": "x", "b": 3},         # TypeError
        {"a": 1},                   # KeyError
        {"b": 1},                   # KeyError
        {"a": 2, "b": 2},
    ]
    result = calculator.calculate_batch(operations)
    assert result == [3, 5, 4]


def test_advancedcalculator_validate_number_variants(calculator):
    """Test validate_number returns False for None/str and True for other types"""
    assert calculator.validate_number(None) is False
    assert calculator.validate_number("123") is False
    assert calculator.validate_number(0) is True
    assert calculator.validate_number(3.14) is True
    assert calculator.validate_number(True) is True  # bool is not str or None


def test_advancedcalculator_complex_calculation_basic(calculator):
    """Test complex_calculation computes ((a+b)/(c*d))*e"""
    result = calculator.complex_calculation(2, 3, 5, 2, 10)  # ((5)/(10))*10 = 5
    assert result == pytest.approx(5.0)


def test_advancedcalculator_complex_calculation_divide_by_zero_raises(calculator):
    """Test complex_calculation raises ZeroDivisionError when c*d is zero"""
    with pytest.raises(ZeroDivisionError):
        calculator.complex_calculation(1, 1, 0, 10, 3)


def test_advancedcalculator_process_list_returns_copy(calculator):
    """Test process_list returns a shallow copy of the items in order"""
    items = [1, "a", 3]
    result = calculator.process_list(items)
    assert result == items
    assert result is not items  # ensure a new list is returned


def test_advancedcalculator_process_list_empty(calculator):
    """Test process_list returns empty list when input is empty"""
    assert calculator.process_list([]) == []


def test_advancedcalculator_find_max_normal_and_edgecases(calculator):
    """Test find_max finds max but defaults to 0 for negatives or empty"""
    assert calculator.find_max([1, 5, 3]) == 5
    assert calculator.find_max([]) == 0
    assert calculator.find_max([-10, -3, -7]) == 0  # starts from 0 per implementation


def test_advancedcalculator_calculate_average_basic(calculator):
    """Test calculate_average computes average of values"""
    result = calculator.calculate_average([1, 2, 3, 4])
    assert result == pytest.approx(2.5)


def test_advancedcalculator_calculate_average_empty_raises(calculator):
    """Test calculate_average raises ZeroDivisionError for empty list"""
    with pytest.raises(ZeroDivisionError):
        calculator.calculate_average([])


def test_advancedcalculator_check_permission_roles(calculator):
    """Test check_permission returns True for admin role, False otherwise"""
    admin_user = Mock(role="admin")
    regular_user = Mock(role="user")
    assert calculator.check_permission(admin_user) is True
    assert calculator.check_permission(regular_user) is False


def test_advancedcalculator_format_output(calculator):
    """Test format_output returns string with prefix"""
    assert calculator.format_output(123) == "Result: 123"
    assert calculator.format_output(3.14) == "Result: 3.14"


def test_advancedcalculator_perform_operation_variants(calculator):
    """Test perform_operation handles add, subtract, multiply, divide, and unknown"""
    assert calculator.perform_operation("add", 2, 3) == 5
    assert calculator.perform_operation("subtract", 5, 2) == 3
    assert calculator.perform_operation("multiply", 3, 4) == 12
    assert calculator.perform_operation("divide", 7, 2) == pytest.approx(3.5)
    assert calculator.perform_operation("unknown", 1, 2) == 0


def test_advancedcalculator_perform_operation_divide_by_zero_raises(calculator):
    """Test perform_operation divide raises ZeroDivisionError on divide by zero"""
    with pytest.raises(ZeroDivisionError):
        calculator.perform_operation("divide", 1, 0)


def test_advancedcalculator_calculate_factorial_values(calculator):
    """Test calculate_factorial for base cases, recursive case, and negative input"""
    assert calculator.calculate_factorial(0) == 1
    assert calculator.calculate_factorial(1) == 1
    assert calculator.calculate_factorial(5) == 120
    assert calculator.calculate_factorial(-3) == 1  # per implementation


def test_advancedcalculator_process_string_identity(calculator):
    """Test process_string returns the same string"""
    assert calculator.process_string("") == ""
    assert calculator.process_string("abc😊") == "abc😊"


def test_advancedcalculator_history_count_and_clear(calculator):
    """Test history count and clear behavior"""
    assert calculator.get_operation_count() == 0
    calculator.add_to_history("op1")
    calculator.add_to_history("op2")
    assert calculator.get_operation_count() == 2
    calculator.clear_history()
    assert calculator.get_operation_count() == 0
    assert calculator.history == []


def test_advancedcalculator_add_to_history_trim_to_last_1000(calculator):
    """Test add_to_history trims history to last 1000 entries"""
    for i in range(1005):
        calculator.add_to_history(i)
    assert len(calculator.history) == 1000
    assert calculator.history[0] == 5
    assert calculator.history[-1] == 1004