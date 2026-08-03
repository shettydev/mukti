// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import perfectionist from 'eslint-plugin-perfectionist';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Mirrors `packages/mukti-api/eslint.config.mjs` so the launcher is held to the
 * same standard as the code it starts — minus the NestJS-specific overrides,
 * which have nothing to lint here.
 *
 * The `.mjs` files are shipped source, not config: `run-api.mjs` and
 * `embedded-mongo.mjs` are spawned as their own processes. They are linted too,
 * but with the type-aware rules off, since they are plain JavaScript outside
 * the TypeScript project.
 */
export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'dist/**', 'node_modules/**', '*.lock'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  perfectionist.configs['recommended-natural'],
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      // TypeScript rules
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],

      // Perfectionist rules
      'perfectionist/sort-imports': [
        'error',
        {
          type: 'natural',
          order: 'asc',
          groups: [
            'type',
            ['builtin', 'external'],
            'internal-type',
            'internal',
            ['parent-type', 'sibling-type', 'index-type'],
            ['parent', 'sibling', 'index'],
            'object',
            'unknown',
          ],
          newlinesBetween: 'always',
          internalPattern: ['^@/.*'],
        },
      ],
      'perfectionist/sort-named-imports': [
        'error',
        {
          type: 'natural',
          order: 'asc',
        },
      ],
      'perfectionist/sort-exports': [
        'error',
        {
          type: 'natural',
          order: 'asc',
        },
      ],

      // General best practices
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
    },
  },
  {
    // Shipped JavaScript, spawned as separate processes — outside the
    // TypeScript project, so the type-aware rules cannot apply.
    files: ['**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: ['**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      // `test()` from `node:test` returns a promise the runner itself tracks;
      // awaiting each top-level call is not how the runner is meant to be used.
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  }
);
