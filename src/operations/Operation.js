/**
 * Abstract base class for all calculator operations.
 * Follows Interface Segregation Principle - defines a single, focused contract.
 */
export class Operation {
  /**
   * Executes the operation on two operands.
   * @param {number} a - First operand
   * @param {number} b - Second operand
   * @returns {number} The result of the operation
   * @throws {Error} If the operation cannot be performed
   */
  execute(a, b) {
    throw new Error('execute method must be implemented by subclass');
  }

  /**
   * Returns the symbol representing this operation.
   * @returns {string} Operation symbol
   */
  getSymbol() {
    throw new Error('getSymbol method must be implemented by subclass');
  }
}

