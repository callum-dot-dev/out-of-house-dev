// Flat ESLint config for the TypeScript backend workspaces.
// apps/web (CRA) lints itself via react-scripts (eslintConfig in its package.json),
// so it is ignored here to avoid the two ESLint engines fighting.
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/node_modules/**',
      '**/coverage/**',
      'apps/web/**',
      // standalone client-repo starters — linted within their own repos.
      'templates/**',
      // legacy supabase artifacts (Deno) — ported & removed by Phase 12.
      'supabase/**',
      // pre-monorepo scripts with stale relative paths — ported in Phase 1.
      'scripts/build-roadmap-pdf.js',
      'scripts/seed.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
