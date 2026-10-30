import { expect, type Page, test } from '@playwright/test';
import { registerUser } from '../fixtures/auth';
import { dragBefore } from '../fixtures/dnd';

// Journey 3: add a folder and a document at the root of the outline, drag the
// document to the top, and confirm the new order survives a reload. A fresh
// user keeps earlier runs' nodes out of the tree.
test.use({ storageState: { cookies: [], origins: [] } });

const DOCUMENT_URL = /\/project\/[0-9a-f-]+\/document\/[0-9a-f-]+$/i;

/** Root outline rows in DOM order, by their title. */
function rootOrder(page: Page) {
  return page
    .locator('[role="treeitem"][aria-level="1"]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
}

async function addToDraft(page: Page, kind: 'Document' | 'Folder') {
  await page.getByRole('button', { name: 'Add to Draft' }).click();
  await page.getByRole('menuitem', { name: kind }).click();
}

test('reordered outline rows persist across a reload', async ({
  page,
  request,
}) => {
  const { creds } = await registerUser(request);

  await page.goto('/login');
  await page.getByLabel('Email').fill(creds.email);
  await page.getByLabel('Password').fill(creds.password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(DOCUMENT_URL);

  await addToDraft(page, 'Folder');
  await expect(
    page.getByRole('treeitem', { name: 'Untitled Folder' })
  ).toBeVisible();

  // The sign-up seed's only root row is the "Chapter One" folder, so this
  // "Untitled" is the one just added.
  await addToDraft(page, 'Document');
  const added = page.getByRole('treeitem', { name: 'Untitled', exact: true });
  await expect(added).toBeVisible();

  await expect
    .poll(() => rootOrder(page))
    .toEqual(['Chapter One', 'Untitled Folder', 'Untitled']);

  const saved = page.waitForResponse(
    (r) =>
      r.url().includes('/graphql') &&
      (r.request().postData() ?? '').includes('moveAndReorderNode')
  );
  await dragBefore(
    page,
    added,
    page.getByRole('treeitem', { name: 'Chapter One' })
  );
  await saved;

  await page.reload();
  await expect
    .poll(() => rootOrder(page))
    .toEqual(['Untitled', 'Chapter One', 'Untitled Folder']);
});
