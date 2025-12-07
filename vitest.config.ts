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
    // Project definitions are in vitest.workspace.ts for Vitest 2.x compatibility
  },
  css: {
    postcss: null,
  },
});
