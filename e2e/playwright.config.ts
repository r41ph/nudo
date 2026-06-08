import { defineConfig, devices } from '@playwright/test';
import {
  API_PORT,
  API_URL,
  STORAGE_STATE,
  WEB_PORT,
  WEB_URL,
} from './fixtures/auth';

/**
 * E2E config. Two web servers (api + web) boot on dedicated ports so the suite
 * never reuses a dev server: the API runs against DB_NAME=nudo_test and the web
 * app is pointed at it via VITE_API_URL (an already-set process env wins over
 * apps/web/.env in Vite). A `setup` project authenticates once and writes
 * storageState that the browser project reuses.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: WEB_URL,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @writing-app/api dev',
      url: `${API_URL}/graphiql`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        API_PORT: String(API_PORT),
        DB_NAME: 'nudo_test',
        FRONTEND_URL: WEB_URL,
      },
    },
    {
      command: `pnpm --filter @writing-app/web exec vite --port ${WEB_PORT} --strictPort`,
      url: WEB_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        VITE_API_URL: API_URL,
      },
    },
  ],
});
