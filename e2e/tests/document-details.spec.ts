import { expect, test } from '@playwright/test';
import { registerUser } from '../fixtures/auth';

// Journey 4: open a document's details from its row menu, edit the Summary,
// and confirm it persists across a reload. A fresh user keeps the Summary of
// earlier runs from leaking into this one.
test.use({ storageState: { cookies: [], origins: [] } });

test('a summary edited in the inspector survives a reload', async ({
  page,
  request,
}) => {
  const { creds } = await registerUser(request);

  await page.goto('/login');
  await page.getByLabel('Email').fill(creds.email);
  await page.getByLabel('Password').fill(creds.password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(/\/document\/[0-9a-f-]+$/i);

  // The welcome document sits inside a folder the tree may restore collapsed,
  // and row actions are display:none until the row is hovered.
  const openDetails = async () => {
    const row = page.getByRole('treeitem', { name: 'Welcome Document' });
    const folder = page.getByRole('treeitem', { name: 'Chapter One' });
    await expect(folder).toBeVisible();
    if (!(await row.isVisible())) {
      await folder.getByRole('button', { name: 'Expand' }).click();
    }
    await row.hover();
    await row
      .getByRole('button', { name: 'Actions for Welcome Document' })
      .click();
    await page.getByRole('menuitem', { name: 'Details' }).click();
    return page.getByRole('complementary', { name: 'Document details' });
  };

  const marker = `e2e-summary-${Date.now()}`;

  // The inspector debounces before PATCHing via the UpdateDocumentDetails
  // mutation — wait for that round-trip so we know the server has the change.
  const saved = page.waitForResponse(
    (r) =>
      r.url().includes('/graphql') &&
      (r.request().postData() ?? '').includes('updateDocumentById')
  );

  await (await openDetails()).getByLabel('Summary').fill(marker);
  await saved;

  await page.reload();
  await expect((await openDetails()).getByLabel('Summary')).toHaveValue(marker);
});
