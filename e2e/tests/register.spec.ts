import { expect, test } from '@playwright/test';
import { uniqueUser } from '../fixtures/auth';

// Journey 1: a brand-new user registers and lands on their seeded welcome
// document. Runs in a fresh, unauthenticated browser.
test.use({ storageState: { cookies: [], origins: [] } });

test('register lands the new user on their welcome document', async ({
  page,
}) => {
  const { email, password } = uniqueUser();

  await page.goto('/login');
  // The login page starts in sign-in mode; toggle to registration.
  await page.getByRole('button', { name: 'Register' }).click();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  // In registration mode the submit button now reads "Register".
  await page.getByRole('button', { name: 'Register' }).click();

  // The API seeds a welcome document on registration; HomePage redirects to it.
  await page.waitForURL(/\/document\/[0-9a-f-]+$/i);
  await expect(page.locator('[data-slate-editor="true"]')).toContainText(
    'Your Story Starts Here'
  );
});
