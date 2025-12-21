"""
Division operation.
Follows Single Responsibility Principle - only handles division.
"""
from .operation import Operation


class DivideOperation(Operation):
    """Division operation implementation."""

    def execute(self, a: float, b: float) -> float:
        """
        Performs division of two operands.

        Raises:
            ValueError: If division by zero is attempted
        """
        if b == 0:
            raise ValueError('Division by zero is not allowed')
        return a / b

    def get_symbol(self) -> str:
        """Returns the division symbol."""
        return '/'

