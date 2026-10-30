import { expect, test, type Page } from '@playwright/test';
import { registerUser } from '../fixtures/auth';

// Journey 6: a card added on the plot board and dragged to another cell is
// still there after a reload. A fresh user starts with an empty plot.
test.use({ storageState: { cookies: [], origins: [] } });

function cell(page: Page, plotline: string, beatIndex: number) {
  return page
    .getByRole('row')
    .filter({ has: page.getByRole('rowheader', { name: plotline }) })
    .getByRole('cell')
    .nth(beatIndex);
}

function graphqlOperation(page: Page, operation: string) {
  return page.waitForResponse(
    (response) =>
      response.url().endsWith('/graphql') &&
      (response.request().postData() ?? '').includes(`mutation ${operation}`)
  );
}

test('a card dragged to another cell stays there after a reload', async ({
  page,
  request,
}) => {
  const { creds } = await registerUser(request);

  await page.goto('/login');
  await page.getByLabel('Email').fill(creds.email);
  await page.getByLabel('Password').fill(creds.password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(/\/project\/[0-9a-f-]+\/document\//i);

  await page.getByRole('link', { name: 'Plot' }).click();
  await page.getByRole('button', { name: 'Start plot' }).click();
  const board = page.getByRole('table', { name: 'Plot board' });
  await expect(board.getByRole('columnheader')).toHaveText([
    'Beginning',
    'Middle',
    'End',
  ]);

  await cell(page, /Main plot/, 0)
    .getByRole('button', { name: 'Add card' })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Edit card' });
  await dialog.getByLabel('Title').fill('The lamp goes dark');
  const created = graphqlOperation(page, 'CreatePlotCard');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await created;
  await expect(dialog).toBeHidden();

  const card = cell(page, /Main plot/, 0).getByRole('button', {
    name: 'The lamp goes dark',
  });
  const target = cell(page, /Main plot/, 1);
  const from = (await card.boundingBox())!;
  const to = (await target.boundingBox())!;
  const moved = graphqlOperation(page, 'MovePlotCard');
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  // dnd-kit starts a pointer drag only after 6px of movement.
  await page.mouse.move(from.x + from.width / 2 + 10, from.y + 20, {
    steps: 3,
  });
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, {
    steps: 10,
  });
  await page.mouse.up();
  await moved;

  await page.reload();
  await expect(
    cell(page, /Main plot/, 1).getByRole('button', {
      name: 'The lamp goes dark',
    })
  ).toBeVisible();
  await expect(
    cell(page, /Main plot/, 0).getByRole('button', {
      name: 'The lamp goes dark',
    })
  ).toHaveCount(0);
});
