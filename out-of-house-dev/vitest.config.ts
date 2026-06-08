import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'apps/**/*.{test,spec}.ts',
      'packages/**/*.{test,spec}.ts',
      'db/**/*.{test,spec}.ts',
    ],
    exclude: ['**/node_modules/**', '**/dist/**', '**/build/**', 'apps/web/**'],
    environment: 'node',
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['apps/api/src/**', 'apps/jobs/src/**', 'apps/builder/src/**', 'packages/shared/src/**'],
    },
  },
});
