import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      // Resolve the shared package from source in tests (no build step needed).
      '@oohdev/shared': resolve(__dirname, 'packages/shared/src/index.ts'),
    },
  },
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
