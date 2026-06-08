import { promises as fs } from 'node:fs';
import path from 'node:path';
import { expect, test as setup } from '@playwright/test';
import { registerUser, STORAGE_STATE } from '../fixtures/auth';

/**
 * Setup project: create an account via the API, then log in through the real UI
 * so the web app writes its own auth storage. We snapshot that with
 * context.storageState() — the browser projects reuse it, and the e2e suite
 * never needs to know which localStorage keys the app uses. Runs first because
 * the browser projects depend on it.
 */
setup('authenticate', async ({ page, request }) => {
  const { creds } = await registerUser(request);

  await page.goto('/login');
  await page.getByLabel('Email').fill(creds.email);
  await page.getByLabel('Password').fill(creds.password);
  await page.getByRole('button', { name: 'Sign In' }).click();

  // On success the login page redirects away from /login.
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));

  await fs.mkdir(path.dirname(STORAGE_STATE), { recursive: true });
  await page.context().storageState({ path: STORAGE_STATE });

  // Sanity-check the app actually persisted auth before other tests rely on it.
  const state = await page.context().storageState();
  expect(state.origins.some((o) => o.localStorage.length > 0)).toBe(true);
});
