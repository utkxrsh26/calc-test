"""
Main entry point demonstrating calculator usage.
"""
from .calculator import Calculator


def main():
    """Demonstrates calculator usage with various test cases."""
    calculator = Calculator()

    print('Calculator Demo')
    print('===============\n')

    # Test basic operations
    test_cases = [
        {'a': 10, 'b': 5, 'op': '+'},
        {'a': 10, 'b': 5, 'op': '-'},
        {'a': 10, 'b': 5, 'op': '*'},
        {'a': 10, 'b': 5, 'op': '/'},
        {'a': 0, 'b': 5, 'op': '+'},
        {'a': -10, 'b': 3, 'op': '*'},
    ]

    for test_case in test_cases:
        try:
            result = calculator.calculate(test_case['a'], test_case['b'], test_case['op'])
            print(f"{test_case['a']} {test_case['op']} {test_case['b']} = {result}")
        except Exception as error:
            print(f"Error: {test_case['a']} {test_case['op']} {test_case['b']} - {error}")

    # Test error cases
    print('\n--- Error Handling ---')
    try:
        calculator.calculate(10, 0, '/')
    except Exception as error:
        print(f'Division by zero: {error}')

    try:
        calculator.calculate(10, 5, '%')
    except ValueError as error:
        print(f'Unsupported operation: {error}')

    print(f"\nSupported operations: {', '.join(calculator.get_supported_operations())}")


if __name__ == '__main__':
    main()

