"""
Calculator class that performs arithmetic operations.

Follows SOLID principles:
- Single Responsibility: Only responsible for coordinating operations
- Open/Closed: Open for extension (new operations) via Strategy pattern, closed for modification
- Liskov Substitution: All operations can be substituted via Operation interface
- Dependency Inversion: Depends on Operation abstraction, not concrete implementations
"""
from typing import Dict, List
from .operations import (
    Operation,
    AddOperation,
    SubtractOperation,
    MultiplyOperation,
    DivideOperation,
)


class Calculator:
    """
    Calculator class that performs arithmetic operations using the Strategy pattern.
    """

    def __init__(self):
        """
        Initializes the calculator with default operations.
        Strategy pattern - operations can be easily extended without modifying Calculator.
        """
        self._operations: Dict[str, Operation] = {
            '+': AddOperation(),
            '-': SubtractOperation(),
            '*': MultiplyOperation(),
            '/': DivideOperation(),
        }

    def register_operation(self, symbol: str, operation: Operation) -> None:
        """
        Registers a new operation with the calculator.
        Follows Open/Closed Principle - allows extension without modification.

        Args:
            symbol: The symbol representing the operation
            operation: The operation instance
        """
        self._operations[symbol] = operation

    def calculate(self, a: float, b: float, operation_symbol: str) -> float:
        """
        Performs a calculation using the specified operation.

        Args:
            a: First operand
            b: Second operand
            operation_symbol: Symbol of the operation to perform

        Returns:
            The result of the calculation

        Raises:
            ValueError: If the operation is not supported or invalid
        """
        self._validate_operands(a, b)

        operation = self._operations.get(operation_symbol)
        if not operation:
            raise ValueError(f'Unsupported operation: {operation_symbol}')

        try:
            return operation.execute(a, b)
        except ValueError as error:
            raise ValueError(f'Calculation failed: {error}') from error

    def _validate_operands(self, a: float, b: float) -> None:
        """
        Validates that operands are valid numbers.

        Args:
            a: First operand
            b: Second operand

        Raises:
            ValueError: If operands are invalid
        """
        if not isinstance(a, (int, float)) or not isinstance(b, (int, float)):
            raise ValueError('Operands must be numbers')

        # Check for NaN (NaN != NaN is True)
        if isinstance(a, float) and (a != a):
            raise ValueError('Operands must be finite numbers')
        if isinstance(b, float) and (b != b):
            raise ValueError('Operands must be finite numbers')

        # Check for infinity
        if isinstance(a, float) and abs(a) == float('inf'):
            raise ValueError('Operands must be finite numbers')
        if isinstance(b, float) and abs(b) == float('inf'):
            raise ValueError('Operands must be finite numbers')

    def get_supported_operations(self) -> List[str]:
        """
        Gets a list of all supported operation symbols.

        Returns:
            List of operation symbols
        """
        return list(self._operations.keys())

