import {
  AddOperation,
  SubtractOperation,
  MultiplyOperation,
  DivideOperation,
} from './operations/index.js';

/**
 * Calculator class that performs arithmetic operations.
 * 
 * Follows SOLID principles:
 * - Single Responsibility: Only responsible for coordinating operations
 * - Open/Closed: Open for extension (new operations) via Strategy pattern, closed for modification
 * - Liskov Substitution: All operations can be substituted via Operation interface
 * - Dependency Inversion: Depends on Operation abstraction, not concrete implementations
 */
export class Calculator {
  constructor() {
    // Strategy pattern - operations can be easily extended without modifying Calculator
    this.operations = new Map([
      ['+', new AddOperation()],
      ['-', new SubtractOperation()],
      ['*', new MultiplyOperation()],
      ['/', new DivideOperation()],
    ]);
  }

  /**
   * Registers a new operation with the calculator.
   * Follows Open/Closed Principle - allows extension without modification.
   * 
   * @param {string} symbol - The symbol representing the operation
   * @param {Operation} operation - The operation instance
   */
  registerOperation(symbol, operation) {
    this.operations.set(symbol, operation);
  }

  /**
   * Performs a calculation using the specified operation.
   * 
   * @param {number} a - First operand
   * @param {number} b - Second operand
   * @param {string} operationSymbol - Symbol of the operation to perform
   * @returns {number} The result of the calculation
   * @throws {Error} If the operation is not supported or invalid
   */
  calculate(a, b, operationSymbol) {
    this._validateOperands(a, b);
    
    const operation = this.operations.get(operationSymbol);
    if (!operation) {
      throw new Error(`Unsupported operation: ${operationSymbol}`);
    }

    try {
      return operation.execute(a, b);
    } catch (error) {
      throw new Error(`Calculation failed: ${error.message}`);
    }
  }

  /**
   * Validates that operands are valid numbers.
   * 
   * @param {number} a - First operand
   * @param {number} b - Second operand
   * @throws {Error} If operands are invalid
   * @private
   */
  _validateOperands(a, b) {
    if (typeof a !== 'number' || typeof b !== 'number') {
      throw new Error('Operands must be numbers');
    }
    
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      throw new Error('Operands must be finite numbers');
    }
  }

  /**
   * Gets a list of all supported operation symbols.
   * 
   * @returns {string[]} Array of operation symbols
   */
  getSupportedOperations() {
    return Array.from(this.operations.keys());
  }
}

