import { expect, test } from '@playwright/test';

/**
 * Smoke test: proves the full e2e stack is wired up — web server serves the
 * SPA, the JS bundle loads, React mounts, and the authenticated storage state
 * (from the setup project) is accepted without crashing the app.
 */
test('app boots and mounts for an authenticated user', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#root > *').first()).toBeVisible();
});
