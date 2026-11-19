import type { CreateAppOptions } from '../app.js';

// Test files share one app per file and register far more users than the
// production limit allows; security.integration.test.ts sets its own low limit.
export const TEST_APP_OPTIONS: CreateAppOptions = {
  authRateLimit: { login: 100_000, refresh: 100_000 },
};
