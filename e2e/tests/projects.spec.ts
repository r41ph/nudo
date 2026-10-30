import { expect, test, type Page } from '@playwright/test';
import { registerUser } from '../fixtures/auth';

// Journey 5: a second project gets its own starter outline, and `/` reopens
// whichever project was used last. A fresh user keeps earlier runs' projects
// out of the switcher.
test.use({ storageState: { cookies: [], origins: [] } });

const DOCUMENT_URL = /\/project\/([0-9a-f-]+)\/document\/[0-9a-f-]+$/i;

function projectIdOf(page: Page): string {
  const match = DOCUMENT_URL.exec(new URL(page.url()).pathname);
  if (!match) throw new Error(`not on a document page: ${page.url()}`);
  return match[1];
}

async function openProjectsMenu(page: Page, email: string) {
  await page.getByRole('button', { name: `Account: ${email}` }).click();
  await page.getByRole('menuitem', { name: 'Projects' }).click();
}

test('a new project has its own outline and / reopens the last-used one', async ({
  page,
  request,
}) => {
  const { creds } = await registerUser(request);

  await page.goto('/login');
  await page.getByLabel('Email').fill(creds.email);
  await page.getByLabel('Password').fill(creds.password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(DOCUMENT_URL);
  const firstProjectId = projectIdOf(page);
  const heading = page.getByRole('heading', { level: 2 });
  await expect(heading).toHaveText('Untitled manuscript');

  await openProjectsMenu(page, creds.email);
  await page.getByRole('menuitem', { name: 'New project…' }).click();
  const dialog = page.getByRole('dialog', { name: 'New project' });
  await dialog.getByLabel('Title').fill('Second Draft');
  await dialog.getByRole('button', { name: 'Save' }).click();

  await expect(heading).toHaveText('Second Draft');
  await page.waitForURL(
    (url) =>
      DOCUMENT_URL.test(url.pathname) && !url.pathname.includes(firstProjectId)
  );

  // Both projects start with a "Chapter One" folder, so the old tree can take
  // an Expand click before the new outline replaces it, and the new one may
  // already be expanded. Short timeouts let each attempt fail and retry.
  const folder = page.getByRole('treeitem', { name: 'Chapter One' });
  const starterDoc = page.getByRole('treeitem', { name: 'Untitled' });
  await expect(async () => {
    if (!(await starterDoc.isVisible())) {
      await folder
        .getByRole('button', { name: 'Expand' })
        .click({ timeout: 1000 });
    }
    await expect(starterDoc).toBeVisible({ timeout: 1000 });
  }).toPass();
  await expect(page.getByRole('treeitem')).toHaveCount(2);
  await expect(
    page.getByRole('treeitem', { name: 'Welcome Document' })
  ).toHaveCount(0);

  await openProjectsMenu(page, creds.email);
  await page
    .getByRole('menuitemradio', { name: 'Untitled manuscript' })
    .click();
  await expect(heading).toHaveText('Untitled manuscript');
  await page.waitForURL(
    (url) =>
      DOCUMENT_URL.test(url.pathname) && url.pathname.includes(firstProjectId)
  );

  await page.goto('/');
  await page.waitForURL(DOCUMENT_URL);
  expect(projectIdOf(page)).toBe(firstProjectId);
  await expect(heading).toHaveText('Untitled manuscript');
});
