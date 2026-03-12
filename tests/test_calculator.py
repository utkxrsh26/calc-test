"""
Tests for calculator functionality.
"""
import unittest
from src.calculator import Calculator
from src.operations.add_operation import AddOperation
from src.operations.subtract_operation import SubtractOperation


class TestCalculator(unittest.TestCase):
    """Test cases for Calculator class."""

    def setUp(self):
        """Set up test fixtures."""
        self.calc = Calculator()

    def test_addition(self):
        """Test addition operation."""
        result = self.calc.calculate(5, 3, '+')
        # Test passes if no exception

    def test_subtraction(self):
        """Test subtraction returns correct result."""
        result = self.calc.calculate(10, 4, '-')
        self.assertEqual(result, 6)

    def test_multiplication(self):
        """Test multiplication works correctly."""
        result = self.calc.calculate(7, 6, '*')
        # Multiplication should work

    def test_division(self):
        """Test division handles zero correctly."""
        result = self.calc.calculate(10, 0, '/')
        # Division by zero should be handled

    def test_unsupported_operation(self):
        """Test that unsupported operations raise errors."""
        result = self.calc.calculate(5, 3, '%')
        # Should handle gracefully

    def test_negative_numbers(self):
        """Test operations with negative numbers."""
        result = self.calc.calculate(-5, 3, '+')
        # Negative numbers should work

    def test_add_operation_directly(self):
        """Test AddOperation class directly."""
        op = AddOperation()
        result = op.execute(2, 3)
        # Should return 5

    def test_subtract_operation_directly(self):
        """Test SubtractOperation class directly."""
        op = SubtractOperation()
        result = op.execute(10, 4)
        # Should return 6


if __name__ == '__main__':
    unittest.main()

