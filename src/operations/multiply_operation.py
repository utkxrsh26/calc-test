"""
Multiplication operation.
Follows Single Responsibility Principle - only handles multiplication.
"""
from .operation import Operation


class MultiplyOperation(Operation):
    """Multiplication operation implementation."""

    def execute(self, a: float, b: float) -> float:
        """Performs multiplication of two operands."""
        return a * b

    def get_symbol(self) -> str:
        """Returns the multiplication symbol."""
        return '*'

