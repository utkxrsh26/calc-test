# Calculator

A simple, well-structured calculator implementation following SOLID principles.

## Features

- Addition, Subtraction, Multiplication, and Division operations
- Clean separation of concerns
- Extensible architecture (easy to add new operations)
- Comprehensive error handling
- SOLID principles implementation

## Architecture

### SOLID Principles Applied

1. **Single Responsibility Principle (SRP)**
   - Each operation class handles only one type of calculation
   - Calculator class only coordinates operations

2. **Open/Closed Principle (OCP)**
   - New operations can be added without modifying existing code
   - Uses Strategy pattern for extensibility

3. **Liskov Substitution Principle (LSP)**
   - All operation classes can be substituted via the Operation interface

4. **Interface Segregation Principle (ISP)**
   - Operation interface is focused and minimal

5. **Dependency Inversion Principle (DIP)**
   - Calculator depends on Operation abstraction, not concrete implementations

## Project Structure

```
calc-test/
├── src/
│   ├── operations/
│   │   ├── Operation.js          # Abstract base class
│   │   ├── AddOperation.js       # Addition operation
│   │   ├── SubtractOperation.js # Subtraction operation
│   │   ├── MultiplyOperation.js  # Multiplication operation
│   │   ├── DivideOperation.js    # Division operation
│   │   └── index.js              # Operations exports
│   ├── Calculator.js             # Main calculator class
│   └── index.js                  # Entry point
├── package.json
└── README.md
```

## Usage

### Basic Usage

```javascript
import { Calculator } from './src/Calculator.js';

const calculator = new Calculator();

// Perform calculations
const sum = calculator.calculate(10, 5, '+');      // 15
const diff = calculator.calculate(10, 5, '-');     // 5
const product = calculator.calculate(10, 5, '*');  // 50
const quotient = calculator.calculate(10, 5, '/'); // 2
```

### Adding Custom Operations

```javascript
import { Calculator } from './src/Calculator.js';
import { Operation } from './src/operations/Operation.js';

// Create a custom operation
class PowerOperation extends Operation {
  execute(a, b) {
    return Math.pow(a, b);
  }
  
  getSymbol() {
    return '^';
  }
}

// Register it with the calculator
const calculator = new Calculator();
calculator.registerOperation('^', new PowerOperation());

// Use it
const result = calculator.calculate(2, 3, '^'); // 8
```

### Error Handling

```javascript
try {
  calculator.calculate(10, 0, '/'); // Throws: Division by zero
} catch (error) {
  console.error(error.message);
}

try {
  calculator.calculate(10, 5, '%'); // Throws: Unsupported operation
} catch (error) {
  console.error(error.message);
}
```

## Running the Project

```bash
npm start
```

## License

MIT

