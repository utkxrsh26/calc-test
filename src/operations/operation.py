"""
Abstract base class for all calculator operations.
Follows Interface Segregation Principle - defines a single, focused contract.
"""
from abc import ABC, abstractmethod


class Operation(ABC):
    """
    Abstract base class that defines the contract for all calculator operations.
    """

    @abstractmethod
    def execute(self, a: float, b: float) -> float:
        """
        Executes the operation on two operands.

        Args:
            a: First operand
            b: Second operand

        Returns:
            The result of the operation

        Raises:
            ValueError: If the operation cannot be performed
        """
        pass

    @abstractmethod
    def get_symbol(self) -> str:
        """
        Returns the symbol representing this operation.

        Returns:
            Operation symbol
        """
        pass

