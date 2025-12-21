import { Operation } from './Operation.js';

/**
 * Multiplication operation.
 * Follows Single Responsibility Principle - only handles multiplication.
 */
export class MultiplyOperation extends Operation {
  execute(a, b) {
    return a * b;
  }

  getSymbol() {
    return '*';
  }
}

