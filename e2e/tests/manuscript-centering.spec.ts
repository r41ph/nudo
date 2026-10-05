import { expect, test, type Page } from '@playwright/test';

// Geometry only a real browser can lay out: the manuscript column is centered
// on the window when it fits, and keeps a 32px gutter beside each panel when
// it doesn't. jsdom can't measure any of this.
const SIDEBAR = 295;
const INSPECTOR = 336;
const GUTTER = 32;

const column = (page: Page) => page.locator('main > div').first();

const measure = async (page: Page) => {
  const box = await column(page).boundingBox();
  const viewport = await page.evaluate(
    () => document.documentElement.clientWidth
  );
  if (!box) throw new Error('manuscript column is not rendered');
  return {
    left: box.x,
    right: box.x + box.width,
    offCenter: box.x + box.width / 2 - viewport / 2,
    viewport,
  };
};

// The column eases into place; poll until it settles rather than sleeping.
const expectSettled = (
  page: Page,
  check: (m: Awaited<ReturnType<typeof measure>>) => boolean
) => expect.poll(async () => check(await measure(page))).toBe(true);

const openDocument = async (page: Page) => {
  await page.goto('/');
  await page.waitForURL(/\/document\/[0-9a-f-]+$/i);
  await expect(page.locator('[data-slate-editor="true"]')).toBeVisible();
};

// The welcome document sits inside a folder the tree may restore collapsed,
// and row actions are display:none until the row is hovered.
const openDetails = async (page: Page) => {
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
  await expect(
    page.getByRole('complementary', { name: 'Document details' })
  ).toBeVisible();
};

test('the column stays on the window center as the inspector opens and closes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await openDocument(page);

  await expectSettled(page, (m) => Math.abs(m.offCenter) <= 1);

  await openDetails(page);
  await expectSettled(page, (m) => Math.abs(m.offCenter) <= 1);

  await page.getByRole('button', { name: 'Close details' }).click();
  await expectSettled(page, (m) => Math.abs(m.offCenter) <= 1);
});

test('keeps a gutter beside both panels when they leave no room to center', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1380, height: 900 });
  await openDocument(page);
  await openDetails(page);

  await expectSettled(
    page,
    (m) =>
      m.left - SIDEBAR >= GUTTER - 0.5 &&
      m.viewport - INSPECTOR - m.right >= GUTTER - 0.5
  );
});

test('pins the column a gutter from the sidebar below the centering threshold', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1300, height: 900 });
  await openDocument(page);

  await expectSettled(page, (m) => Math.abs(m.left - (SIDEBAR + GUTTER)) <= 1);
});
