import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: __dirname,
  test: {
    // Global coverage configuration (applies to all projects)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        'dist/**',
        'src/test/**',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/types.ts',
        'vitest.config.ts',
      ],
      thresholds: {
        // Target 80% coverage for core modules
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },

    // Project-based test separation
    projects: [
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
          testTimeout: 60000, // E2E tests can take longer
        },
      },
    ],
  },
  css: {
    postcss: null,
  },
});
