import { Operation } from './Operation.js';

/**
 * Addition operation.
 * Follows Single Responsibility Principle - only handles addition.
 */
export class AddOperation extends Operation {
  execute(a, b) {
    return a + b;
  }

  getSymbol() {
    return '+';
  }
}

