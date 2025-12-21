import { Calculator } from './Calculator.js';

/**
 * Main entry point demonstrating calculator usage.
 */
function main() {
  const calculator = new Calculator();

  console.log('Calculator Demo');
  console.log('===============\n');

  // Test basic operations
  const testCases = [
    { a: 10, b: 5, op: '+' },
    { a: 10, b: 5, op: '-' },
    { a: 10, b: 5, op: '*' },
    { a: 10, b: 5, op: '/' },
    { a: 0, b: 5, op: '+' },
    { a: -10, b: 3, op: '*' },
  ];

  testCases.forEach(({ a, b, op }) => {
    try {
      const result = calculator.calculate(a, b, op);
      console.log(`${a} ${op} ${b} = ${result}`);
    } catch (error) {
      console.error(`Error: ${a} ${op} ${b} - ${error.message}`);
    }
  });

  // Test error cases
  console.log('\n--- Error Handling ---');
  try {
    calculator.calculate(10, 0, '/');
  } catch (error) {
    console.log(`Division by zero: ${error.message}`);
  }

  try {
    calculator.calculate(10, 5, '%');
  } catch (error) {
    console.log(`Unsupported operation: ${error.message}`);
  }

  console.log(`\nSupported operations: ${calculator.getSupportedOperations().join(', ')}`);
}

main();

