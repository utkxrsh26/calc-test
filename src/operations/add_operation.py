"""
Addition operation.
Follows Single Responsibility Principle - only handles addition.
"""
from .operation import Operation


class AddOperation(Operation):
    """Addition operation implementation."""

    def execute(self, a: float, b: float) -> float:
        """Performs addition of two operands."""
        return a + b

    def get_symbol(self) -> str:
        """Returns the addition symbol."""
        return '+'

