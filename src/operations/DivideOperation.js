import { Operation } from './Operation.js';

/**
 * Division operation.
 * Follows Single Responsibility Principle - only handles division.
 */
export class DivideOperation extends Operation {
  execute(a, b) {
    if (b === 0) {
      throw new Error('Division by zero is not allowed');
    }
    return a / b;
  }

  getSymbol() {
    return '/';
  }
}

