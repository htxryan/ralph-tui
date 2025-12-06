/**
 * Global Test Setup for Ralph TUI
 *
 * This file runs before each test file and sets up:
 * - Global mocks for external dependencies
 * - Common test utilities
 * - Environment configuration
 * - Cleanup handlers
 */

import { beforeAll, afterAll, afterEach, vi } from 'vitest';

// Store original process values
const originalEnv = { ...process.env };
const originalCwd = process.cwd;

/**
 * Global setup - runs once before all tests
 */
beforeAll(() => {
  // Set test environment flag
  process.env.NODE_ENV = 'test';
  process.env.RALPH_TEST = '1';

  // Silence console warnings in tests unless debugging
  if (!process.env.DEBUG_TESTS) {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  }
});

/**
 * Cleanup after each test
 */
afterEach(() => {
  // Clear all mocks between tests
  vi.clearAllMocks();

  // Reset timers if used
  vi.useRealTimers();
});

/**
 * Global teardown - runs once after all tests
 */
afterAll(() => {
  // Restore original environment
  process.env = originalEnv;
  process.cwd = originalCwd;

  // Restore all mocks
  vi.restoreAllMocks();
});

/**
 * Custom matchers can be extended here
 * Example:
 * expect.extend({
 *   toContainMessage(received, expected) {
 *     // custom matcher implementation
 *   }
 * });
 */

/**
 * Re-export common utilities for convenience
 */
export { vi } from 'vitest';
