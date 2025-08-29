// ESLint v9 flat config
import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': 'error',
      'no-var': 'error',
      'prefer-const': ['warn', { destructuring: 'all' }],
      'prefer-arrow-callback': 'warn',
      'arrow-body-style': ['warn', 'as-needed'],
      'object-shorthand': ['warn', 'always'],
      'prefer-template': 'warn',
      'prefer-destructuring': [
        'warn',
        { array: true, object: true },
        { enforceForRenamedProperties: false }
      ],
      'prefer-rest-params': 'warn',
      'prefer-spread': 'warn',
      'prefer-exponentiation-operator': 'warn',
      'prefer-numeric-literals': 'warn',
      'prefer-object-has-own': 'warn',
      'prefer-regex-literals': 'warn',
      'no-useless-rename': 'warn',
      'symbol-description': 'warn'
    }
  },
  {
    files: ['tests/**/*.test.js'],
    languageOptions: {
      globals: globals.node
    },
    rules: {
      'no-unused-vars': 'off'
    }
  },
  {
    ignores: [
      'node_modules/**',
      'coverage/**'
    ]
  }
];
