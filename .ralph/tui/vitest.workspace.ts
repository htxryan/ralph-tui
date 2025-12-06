import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  // Unit tests - co-located component and lib tests
  {
    test: {
      name: 'unit',
      environment: 'node',
      include: [
        'src/components/**/*.test.{ts,tsx}',
        'src/lib/**/*.test.{ts,tsx}',
        'src/hooks/**/*.test.{ts,tsx}',
        'src/commands/**/*.test.{ts,tsx}',
      ],
      exclude: ['node_modules', 'dist', 'src/test/**'],
      setupFiles: ['./src/test/setup.ts'],
      testTimeout: 10000,
    },
  },
  // Integration tests - multi-module workflows
  {
    test: {
      name: 'integration',
      environment: 'node',
      include: ['src/test/*.test.{ts,tsx}'],
      exclude: ['node_modules', 'dist', 'src/test/e2e/**'],
      setupFiles: ['./src/test/setup.ts'],
      testTimeout: 30000,
    },
  },
  // E2E tests - full application scenarios
  {
    test: {
      name: 'e2e',
      environment: 'node',
      include: ['src/test/e2e/**/*.test.{ts,tsx}'],
      exclude: ['node_modules', 'dist'],
      setupFiles: ['./src/test/setup.ts'],
      testTimeout: 60000,
    },
  },
]);
