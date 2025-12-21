"""
Central export point for all operations.
Follows Dependency Inversion Principle - exports abstractions.
"""
from .operation import Operation
from .add_operation import AddOperation
from .subtract_operation import SubtractOperation
from .multiply_operation import MultiplyOperation
from .divide_operation import DivideOperation

__all__ = [
    'Operation',
    'AddOperation',
    'SubtractOperation',
    'MultiplyOperation',
    'DivideOperation',
]

