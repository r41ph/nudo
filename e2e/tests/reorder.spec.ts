import { expect, type Page, test } from '@playwright/test';
import { dragBefore } from '../fixtures/dnd';

// Journey 3: create a folder and a document, reorder the root documents via
// drag-and-drop, and confirm the new order survives a reload. Uses the
// authenticated storageState from the setup project.

/** Root tree entries (documents + folders) in DOM order, by their title. */
function treeOrder(page: Page) {
  return page
    .getByRole('treeitem')
    .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
}

const docOrder = async (page: Page) =>
  (await treeOrder(page)).filter((label) => label !== 'Untitled Folder');

test('reordered documents persist across a reload', async ({ page }) => {
  await page.goto('/');
  await page.waitForURL(/\/document\/[0-9a-f-]+$/i);

  // Create a folder...
  await page.getByRole('button', { name: 'Add New' }).click();
  await page.getByRole('menuitem', { name: 'New Folder' }).click();
  await expect(
    page.getByRole('treeitem', { name: 'Untitled Folder' })
  ).toBeVisible();

  // ...and a second document (creation navigates to it).
  await page.getByRole('button', { name: 'Add New' }).click();
  await page.getByRole('menuitem', { name: 'New Document' }).click();
  await page.waitForURL(/\/document\/[0-9a-f-]+$/i);
  await expect(
    page.getByRole('treeitem', { name: 'Untitled Document' })
  ).toBeVisible();

  expect(await docOrder(page)).toEqual([
    'Welcome Document',
    'Untitled Document',
  ]);

  // Drag the second document above the first; wait for the persist round-trip.
  const saved = page.waitForResponse(
    (r) =>
      r.url().includes('/graphql') &&
      (r.request().postData() ?? '').includes('moveAndReorderDocument')
  );
  await dragBefore(
    page,
    page.getByRole('treeitem', { name: 'Untitled Document' }),
    page.getByRole('treeitem', { name: 'Welcome Document' })
  );
  await saved;

  await page.reload();
  await expect(
    page.getByRole('treeitem', { name: 'Untitled Folder' })
  ).toBeVisible();
  expect(await docOrder(page)).toEqual([
    'Untitled Document',
    'Welcome Document',
  ]);
});
