import { expect, type Page, test } from '@playwright/test';
import { registerUser } from '../fixtures/auth';
import { dragBefore, pointerDrag } from '../fixtures/dnd';
import {
  addPlotline,
  graphqlOperation,
  signInAndStartPlot,
} from '../fixtures/plot';

// Journey 3: reordered outline rows and plotlines survive a reload. A fresh
// user keeps earlier runs' nodes out of the tree and the plot.
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

test('a plotline reordered in the plot sidebar keeps the board order after a reload', async ({
  page,
  request,
}) => {
  const board = await signInAndStartPlot(page, request);
  await addPlotline(page);
  await expect(board.getByRole('rowheader')).toHaveText([
    /Main plot/,
    /Untitled plotline/,
  ]);

  const plotlines = page.getByRole('list', { name: 'Plotlines' });
  const saved = graphqlOperation(page, 'ReorderPlotlines');
  await pointerDrag(
    page,
    plotlines.getByRole('button', { name: 'Drag Untitled plotline' }),
    plotlines
      .getByRole('listitem')
      .filter({ has: page.getByRole('checkbox', { name: 'Show Main plot' }) })
  );
  await saved;

  await page.reload();
  await expect(board.getByRole('rowheader')).toHaveText([
    /Untitled plotline/,
    /Main plot/,
  ]);
});
