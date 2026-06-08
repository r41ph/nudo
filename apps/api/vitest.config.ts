import path from 'path';
import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@api': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Integration tests need a real DB and run via vitest.integration.config.ts.
    exclude: [...configDefaults.exclude, 'src/**/*.integration.test.ts'],
    // Diagnostic only — no thresholds. Coverage from the unit run; the
    // integration suite (separate config + real DB) is not folded in.
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/index.ts', // process bootstrap
        'src/test/**', // harness + integration suites
        'src/db/migrations/**', // forward-only migrations, run by node-pg-migrate
        'src/**/*.types.ts',
      ],
    },
  },
});
