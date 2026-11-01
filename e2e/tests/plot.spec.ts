import { expect, test, type Page } from '@playwright/test';
import { pointerDrag } from '../fixtures/dnd';
import {
  addBeat,
  addPlotline,
  graphqlOperation,
  signInAndStartPlot,
} from '../fixtures/plot';

// Journey 6: the plot board and its sidebar. A fresh user per test starts
// with an empty plot.
test.use({ storageState: { cookies: [], origins: [] } });

function cell(page: Page, plotline: string | RegExp, beatIndex: number) {
  return page
    .getByRole('row')
    .filter({ has: page.getByRole('rowheader', { name: plotline }) })
    .getByRole('cell')
    .nth(beatIndex);
}

test('a card dragged to another cell stays there after a reload', async ({
  page,
  request,
}) => {
  await signInAndStartPlot(page, request);

  await cell(page, /Main plot/, 0)
    .getByRole('button', { name: 'Add card' })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Edit card' });
  await dialog.getByLabel('Title').fill('The lamp goes dark');
  const created = graphqlOperation(page, 'CreatePlotCard');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await created;
  await expect(dialog).toBeHidden();

  const moved = graphqlOperation(page, 'MovePlotCard');
  await pointerDrag(
    page,
    cell(page, /Main plot/, 0).getByRole('button', {
      name: 'The lamp goes dark',
    }),
    cell(page, /Main plot/, 1)
  );
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

test('a plotline and a beat hidden from the sidebar stay hidden after a reload', async ({
  page,
  request,
}) => {
  const board = await signInAndStartPlot(page, request);
  await addPlotline(page);
  await expect(board.getByRole('rowheader')).toHaveText([
    /Main plot/,
    /Untitled plotline/,
  ]);

  await page.getByRole('checkbox', { name: 'Show Untitled plotline' }).click();
  await page.getByRole('checkbox', { name: 'Show Middle' }).click();

  const expectFiltered = async () => {
    await expect(board.getByRole('rowheader')).toHaveText([/Main plot/]);
    await expect(board.getByRole('columnheader')).toHaveText([
      'Beginning',
      'End',
    ]);
    await expect(
      page.getByRole('checkbox', { name: 'Show Untitled plotline' })
    ).not.toBeChecked();
    await expect(
      page.getByRole('checkbox', { name: 'Show Middle' })
    ).not.toBeChecked();
  };
  await expectFiltered();

  await page.reload();
  await expectFiltered();
});

test('each sidebar list scrolls on its own', async ({ page, request }) => {
  await signInAndStartPlot(page, request);
  for (let i = 1; i < 20; i++) await addPlotline(page);
  for (let i = 3; i < 20; i++) await addBeat(page);

  const plotlines = page.getByRole('list', { name: 'Plotlines' });
  const beats = page.getByRole('list', { name: 'Beats' });
  await expect(plotlines.getByRole('checkbox')).toHaveCount(20);
  await expect(beats.getByRole('checkbox')).toHaveCount(20);

  const scrollTop = (list: typeof plotlines) =>
    list.evaluate((el) => el.scrollTop);
  const fixed = [
    page.getByRole('heading', { name: 'Plotlines' }),
    page.getByRole('heading', { name: 'Beats' }),
    page.getByRole('status', { name: 'Plot totals' }),
  ];
  const boxes = () => Promise.all(fixed.map((el) => el.boundingBox()));

  // Each list must overflow, or scrolling it proves nothing.
  expect(
    await plotlines.evaluate((el) => el.scrollHeight > el.clientHeight)
  ).toBe(true);
  expect(await beats.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(
    true
  );

  await beats.evaluate((el) => (el.scrollTop = 0));
  const beatsBefore = await scrollTop(beats);
  const boxesBefore = await boxes();

  await plotlines.hover();
  await page.mouse.wheel(0, 2000);
  await expect.poll(() => scrollTop(plotlines)).toBeGreaterThan(0);

  expect(await scrollTop(beats)).toBe(beatsBefore);
  expect(await boxes()).toEqual(boxesBefore);
});
