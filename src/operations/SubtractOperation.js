import { Operation } from './Operation.js';

/**
 * Subtraction operation.
 * Follows Single Responsibility Principle - only handles subtraction.
 */
export class SubtractOperation extends Operation {
  execute(a, b) {
    return a - b;
  }

  getSymbol() {
    return '-';
  }
}

