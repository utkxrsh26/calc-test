# Calculator

A simple, well-structured calculator implementation following SOLID principles.

## Features

- Addition, Subtraction, Multiplication, and Division operations
- Clean separation of concerns
- Extensible architecture (easy to add new operations)
- Comprehensive error handling
- SOLID principles implementation
- Type hints for better code clarity

## Architecture

### SOLID Principles Applied

1. **Single Responsibility Principle (SRP)**
   - Each operation class handles only one type of calculation
   - Calculator class only coordinates operations

2. **Open/Closed Principle (OCP)**
   - New operations can be added without modifying existing code
   - Uses Strategy pattern for extensibility

3. **Liskov Substitution Principle (LSP)**
   - All operation classes can be substituted via the Operation abstract base class

4. **Interface Segregation Principle (ISP)**
   - Operation abstract base class is focused and minimal

5. **Dependency Inversion Principle (DIP)**
   - Calculator depends on Operation abstraction, not concrete implementations

## Project Structure

```
calc-test/
├── src/
│   ├── operations/
│   │   ├── __init__.py           # Operations exports
│   │   ├── operation.py          # Abstract base class
│   │   ├── add_operation.py      # Addition operation
│   │   ├── subtract_operation.py # Subtraction operation
│   │   ├── multiply_operation.py  # Multiplication operation
│   │   └── divide_operation.py   # Division operation
│   ├── __init__.py               # Package exports
│   ├── calculator.py             # Main calculator class
│   └── main.py                   # Entry point
├── requirements.txt
├── setup.py
└── README.md
```

## Requirements

- Python 3.7 or higher
- No external dependencies

## Installation

```bash
# Install the package (optional, for development)
pip install -e .
```

## Usage

### Basic Usage

```python
from src.calculator import Calculator

calculator = Calculator()

# Perform calculations
sum_result = calculator.calculate(10, 5, '+')      # 15
diff_result = calculator.calculate(10, 5, '-')     # 5
product_result = calculator.calculate(10, 5, '*')  # 50
quotient_result = calculator.calculate(10, 5, '/')  # 2
```

### Adding Custom Operations

```python
from src.calculator import Calculator
from src.operations import Operation

# Create a custom operation
class PowerOperation(Operation):
    def execute(self, a: float, b: float) -> float:
        return a ** b
    
    def get_symbol(self) -> str:
        return '^'

# Register it with the calculator
calculator = Calculator()
calculator.register_operation('^', PowerOperation())

# Use it
result = calculator.calculate(2, 3, '^')  # 8
```

### Error Handling

```python
try:
    calculator.calculate(10, 0, '/')  # Raises ValueError: Division by zero
except ValueError as error:
    print(error)

try:
    calculator.calculate(10, 5, '%')  # Raises ValueError: Unsupported operation
except ValueError as error:
    print(error)
```

## Running the Project

```bash
# Run the demo
python -m src.main

# Or directly
python src/main.py
```

## Development

```bash
# Install in development mode
pip install -e .

# Run tests (if you add them)
python -m pytest
```

## License

MIT
