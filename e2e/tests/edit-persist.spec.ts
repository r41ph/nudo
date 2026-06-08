import { expect, test } from '@playwright/test';
import { registerUser } from '../fixtures/auth';

// Journey 2: log in, edit a document, and confirm autosave persists the change
// across a reload. Starts unauthenticated and logs in through the real UI.
test.use({ storageState: { cookies: [], origins: [] } });

test('typed content survives a reload (autosave)', async ({
  page,
  request,
}) => {
  const { creds } = await registerUser(request);

  await page.goto('/login');
  await page.getByLabel('Email').fill(creds.email);
  await page.getByLabel('Password').fill(creds.password);
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Login redirects to the welcome document.
  await page.waitForURL(/\/document\/[0-9a-f-]+$/i);
  const editor = page.locator('[data-slate-editor="true"]');
  await expect(editor).toContainText('Your Story Starts Here');

  const marker = `e2e-autosave-${Date.now()}`;

  // Autosave debounces 2.5s, then PATCHes via the updateDocumentContent
  // mutation — wait for that round-trip so we know the server has the change.
  const saved = page.waitForResponse(
    (r) =>
      r.url().includes('/graphql') &&
      (r.request().postData() ?? '').includes('updateDocumentContent')
  );

  await editor.click();
  await page.keyboard.press('End');
  await page.keyboard.type(` ${marker}`);
  await saved;

  await page.reload();
  await expect(page.locator('[data-slate-editor="true"]')).toContainText(
    marker
  );
});
