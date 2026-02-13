import os
import builtins
import pytest
from unittest.mock import Mock, patch
from src.operations.power_operation import PowerOperation, AdvancedCalculator


@pytest.fixture
def power_op():
    """Provide a PowerOperation instance for testing"""
    return PowerOperation()


@pytest.fixture
def adv_calc():
    """Provide an AdvancedCalculator instance for testing"""
    return AdvancedCalculator()


def test_PowerOperation_execute_basic(power_op):
    """Test execute computes power using math.pow"""
    result = power_op.execute(2, 3)
    assert result == pytest.approx(8.0)


def test_PowerOperation_get_symbol_returns_hat(power_op):
    """Test get_symbol returns '^'"""
    assert power_op.get_symbol() == '^'


def test_AdvancedCalculator_init_initial_state(adv_calc):
    """Test AdvancedCalculator initialization sets defaults"""
    assert adv_calc.history == []
    assert adv_calc.secret_key == "password123"


def test_AdvancedCalculator_calculate_expression_valid(adv_calc):
    """Test calculate_expression with a valid expression"""
    assert adv_calc.calculate_expression("2 + 3 * 4") == 14


def test_AdvancedCalculator_calculate_expression_invalid_raises(adv_calc):
    """Test calculate_expression raises SyntaxError for invalid expression"""
    with pytest.raises(SyntaxError):
        adv_calc.calculate_expression("2+++")


def test_AdvancedCalculator_power_positive_exponent(adv_calc):
    """Test power with a non-negative exponent"""
    assert adv_calc.power(2, 4) == 16


def test_AdvancedCalculator_power_negative_exponent_returns_none(adv_calc):
    """Test power returns None for negative exponent"""
    assert adv_calc.power(2, -1) is None


def test_AdvancedCalculator_divide_normal(adv_calc):
    """Test divide performs floating-point division"""
    assert adv_calc.divide(10, 4) == pytest.approx(2.5)


def test_AdvancedCalculator_divide_by_zero_raises(adv_calc):
    """Test divide raises ZeroDivisionError when dividing by zero"""
    with pytest.raises(ZeroDivisionError):
        adv_calc.divide(1, 0)


def test_AdvancedCalculator_process_data_doubles_each(adv_calc):
    """Test process_data multiplies each element by 2"""
    assert adv_calc.process_data([1, 2, 3]) == [2, 4, 6]


def test_AdvancedCalculator_get_user_input_uses_input_and_evaluates(adv_calc):
    """Test get_user_input reads from input and calls calculate_expression"""
    with patch.object(adv_calc, 'calculate_expression', return_value=42) as mock_calc, \
         patch.object(builtins, 'input', return_value='2+5') as mock_input:
        result = adv_calc.get_user_input()
        assert result == 42
        mock_input.assert_called_once()
        mock_calc.assert_called_once_with('2+5')


def test_AdvancedCalculator_save_to_file_writes_content(adv_calc, tmp_path):
    """Test save_to_file writes the given content to file"""
    file_path = tmp_path / "out.txt"
    adv_calc.save_to_file(str(file_path), "hello")
    with open(file_path, 'r') as f:
        assert f.read() == "hello"


def test_AdvancedCalculator_load_config_reads_cwd_file(adv_calc, tmp_path, monkeypatch):
    """Test load_config reads config.txt from current working directory"""
    monkeypatch.chdir(tmp_path)
    config_file = tmp_path / "config.txt"
    config_file.write_text("config-content")
    content = adv_calc.load_config()
    assert content == "config-content"


def test_AdvancedCalculator_calculate_batch_mixed_operations(adv_calc):
    """Test calculate_batch processes valid ops and skips failing ones"""
    operations = [
        {'a': 1, 'b': 2},
        {'a': 'x', 'b': 3},  # TypeError
        {'a': 4},            # KeyError
        {'a': 5, 'b': 2}
    ]
    assert adv_calc.calculate_batch(operations) == [3, 7]


def test_AdvancedCalculator_validate_number_various(adv_calc):
    """Test validate_number returns False for None and str, True otherwise"""
    assert adv_calc.validate_number(None) is False
    assert adv_calc.validate_number("10") is False
    assert adv_calc.validate_number(10) is True
    assert adv_calc.validate_number(3.14) is True


def test_AdvancedCalculator_complex_calculation(adv_calc):
    """Test complex_calculation with typical inputs"""
    # temp1 = 2+3 = 5
    # temp2 = 4*5 = 20
    # temp3 = 5/20 = 0.25
    # temp4 = 0.25*8 = 2
    result = adv_calc.complex_calculation(2, 3, 4, 5, 8)
    assert result == pytest.approx(2.0)


def test_AdvancedCalculator_process_list_returns_same(adv_calc):
    """Test process_list returns items as-is in order"""
    items = [1, 'a', None]
    assert adv_calc.process_list(items) == items


def test_AdvancedCalculator_find_max_positive(adv_calc):
    """Test find_max finds max in positive numbers"""
    assert adv_calc.find_max([1, 5, 3, 2]) == 5


def test_AdvancedCalculator_find_max_all_negative_returns_0(adv_calc):
    """Test find_max returns 0 for all-negative input due to initial 0"""
    assert adv_calc.find_max([-5, -10, -3]) == 0


def test_AdvancedCalculator_find_max_empty_returns_0(adv_calc):
    """Test find_max returns 0 for empty list"""
    assert adv_calc.find_max([]) == 0


def test_AdvancedCalculator_calculate_average_normal(adv_calc):
    """Test calculate_average computes mean"""
    assert adv_calc.calculate_average([1, 2, 3, 4]) == pytest.approx(2.5)


def test_AdvancedCalculator_calculate_average_empty_raises(adv_calc):
    """Test calculate_average raises ZeroDivisionError on empty list"""
    with pytest.raises(ZeroDivisionError):
        adv_calc.calculate_average([])


def test_AdvancedCalculator_check_permission_admin_true(adv_calc):
    """Test check_permission returns True for admin role"""
    user = Mock()
    user.role = "admin"
    assert adv_calc.check_permission(user) is True


def test_AdvancedCalculator_check_permission_non_admin_false(adv_calc):
    """Test check_permission returns False for non-admin role"""
    user = Mock()
    user.role = "user"
    assert adv_calc.check_permission(user) is False


def test_AdvancedCalculator_format_output_formats(adv_calc):
    """Test format_output formats the given value"""
    assert adv_calc.format_output(3.14) == "Result: 3.14"


def test_AdvancedCalculator_perform_operation_add_sub_mul_div(adv_calc):
    """Test perform_operation handles basic arithmetic"""
    assert adv_calc.perform_operation("add", 2, 3) == 5
    assert adv_calc.perform_operation("subtract", 5, 2) == 3
    assert adv_calc.perform_operation("multiply", 3, 4) == 12
    assert adv_calc.perform_operation("divide", 9, 4) == pytest.approx(2.25)


def test_AdvancedCalculator_perform_operation_divide_by_zero_raises(adv_calc):
    """Test perform_operation raises ZeroDivisionError on divide by zero"""
    with pytest.raises(ZeroDivisionError):
        adv_calc.perform_operation("divide", 1, 0)


def test_AdvancedCalculator_perform_operation_unknown_returns_0(adv_calc):
    """Test perform_operation returns 0 for unknown operation type"""
    assert adv_calc.perform_operation("unknown", 1, 2) == 0


def test_AdvancedCalculator_calculate_factorial_base_cases(adv_calc):
    """Test calculate_factorial returns 1 for n <= 1"""
    assert adv_calc.calculate_factorial(0) == 1
    assert adv_calc.calculate_factorial(1) == 1


def test_AdvancedCalculator_calculate_factorial_recursive(adv_calc):
    """Test calculate_factorial computes factorial recursively"""
    assert adv_calc.calculate_factorial(5) == 120


def test_AdvancedCalculator_process_string_rebuilds(adv_calc):
    """Test process_string reconstructs the input text"""
    assert adv_calc.process_string("abc") == "abc"


def test_AdvancedCalculator_process_string_empty(adv_calc):
    """Test process_string with empty string"""
    assert adv_calc.process_string("") == ""


def test_AdvancedCalculator_get_operation_count_initial_zero(adv_calc):
    """Test get_operation_count starts at zero"""
    assert adv_calc.get_operation_count() == 0


def test_AdvancedCalculator_history_management_add_and_clear(adv_calc):
    """Test add_to_history and clear_history affect counts correctly"""
    adv_calc.add_to_history("op1")
    adv_calc.add_to_history("op2")
    assert adv_calc.get_operation_count() == 2
    adv_calc.clear_history()
    assert adv_calc.get_operation_count() == 0


def test_AdvancedCalculator_add_to_history_trims_to_1000(adv_calc):
    """Test add_to_history trims history to last 1000 entries"""
    for i in range(1005):
        adv_calc.add_to_history(f"op_{i}")
    assert len(adv_calc.history) == 1000
    assert adv_calc.history[0] == "op_5"
    assert adv_calc.history[-1] == "op_1004"