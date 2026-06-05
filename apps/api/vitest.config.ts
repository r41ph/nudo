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
  },
});
