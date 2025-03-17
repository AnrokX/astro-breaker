// Re-export Jest globals to mock Bun test API
import { jest, describe, test, expect, beforeEach } from '@jest/globals';

export { jest, describe, test, expect, beforeEach };

export const mock = jest.fn;