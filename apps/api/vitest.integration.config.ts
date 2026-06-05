import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@api': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.integration.test.ts'],
    // Create + migrate the test DB once before the suite.
    globalSetup: ['./src/test/global-setup.integration.ts'],
    // Truncate between every test for isolation.
    setupFiles: ['./src/test/setup.integration.ts'],
    // One shared test DB truncated per test — files must not run in parallel.
    fileParallelism: false,
    // createApp()'s pool and PostGraphile read DB_NAME at import; point them at
    // the test database. dotenv (in config/env.ts) won't override an already-set
    // var, so this wins over the root .env.
    env: { DB_NAME: 'nudo_test' },
  },
});
