import base from './eslint.config.mjs';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  ...base,
  {
    files: ['**/*.{ts,tsx,mts,mjs,js}'],
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
    },
  },
]);
