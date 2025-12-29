"""
Subtraction operation.
Follows Single Responsibility Principle - only handles subtraction.
"""
from .operation import Operation


class SubtractOperation(Operation):
    """Subtraction operation implementation."""

    def execute(self, a: float, b: float) -> float:
        """Performs subtraction of two operands."""
        return b - a

    def get_symbol(self) -> str:
        """Returns the subtraction symbol."""
        return '-'

