import {
  expect,
  test,
  type APIRequestContext,
  type Locator,
  type Page,
} from '@playwright/test';
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

async function startPlotOfSize(
  page: Page,
  request: APIRequestContext,
  beats: number,
  plotlines: number
) {
  const board = await signInAndStartPlot(page, request);
  for (let i = 1; i < plotlines; i++) await addPlotline(page);
  for (let i = 3; i < beats; i++) await addBeat(page);
  await expect(board.getByRole('columnheader')).toHaveCount(beats);
  await expect(board.getByRole('rowheader')).toHaveCount(plotlines);
  return board;
}

const boardScroll = (board: Locator) =>
  board.evaluate((el) => {
    const container = el.parentElement!;
    return {
      left: container.scrollLeft,
      top: container.scrollTop,
      maxLeft: container.scrollWidth - container.clientWidth,
      maxTop: container.scrollHeight - container.clientHeight,
    };
  });

const scrollBoardTo = (board: Locator, left: number, top: number) =>
  board.evaluate(
    (el, [x, y]) =>
      el.parentElement!.scrollTo({ left: x, top: y, behavior: 'instant' }),
    [left, top]
  );

async function box(locator: Locator) {
  const rect = await locator.boundingBox();
  if (!rect) throw new Error(`${locator} has no box`);
  return rect;
}

test('the minimap moves the board, and follows it', async ({
  page,
  request,
}) => {
  const board = await startPlotOfSize(page, request, 10, 8);
  const frame = page.getByRole('group', { name: 'Board position' });
  const miniature = page.getByTestId('plot-minimap-miniature');
  await expect(frame).toBeVisible();
  const { maxLeft, maxTop } = await boardScroll(board);
  expect(maxLeft).toBeGreaterThan(0);
  expect(maxTop).toBeGreaterThan(0);

  const start = await box(frame);
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    start.x + start.width / 2 + 40,
    start.y + start.height / 2 + 15,
    { steps: 5 }
  );
  await page.mouse.up();
  const dragged = await boardScroll(board);
  expect(dragged.left).toBeGreaterThan(0);
  expect(dragged.top).toBeGreaterThan(0);

  await scrollBoardTo(board, 0, 0);
  const corner = await box(miniature);
  await page.mouse.click(
    corner.x + corner.width - 1,
    corner.y + corner.height - 1
  );
  await expect
    .poll(() => boardScroll(board))
    .toMatchObject({ left: maxLeft, top: maxTop });

  // Each key lands the next column against the sticky labels, and the next
  // row under the sticky header.
  await scrollBoardTo(board, 0, 0);
  await frame.focus();
  // Measured together: the sticky cells only settle once the scroll is done.
  await page.keyboard.press('ArrowRight');
  await expect
    .poll(async () => {
      const labels = await box(board.getByRole('rowheader').first());
      const column = await box(board.getByRole('columnheader').nth(1));
      return column.x - (labels.x + labels.width);
    })
    .toBeCloseTo(0, 0);
  await page.keyboard.press('ArrowDown');
  await expect
    .poll(async () => {
      const header = await box(board.getByRole('columnheader').first());
      const row = await box(board.getByRole('rowheader').nth(1));
      return row.y - (header.y + header.height);
    })
    .toBeCloseTo(0, 0);

  await scrollBoardTo(board, 0, 0);
  await expect.poll(async () => (await box(frame)).x).toBeCloseTo(corner.x, 0);
  await scrollBoardTo(board, maxLeft, maxTop);
  await expect
    .poll(async () => {
      const f = await box(frame);
      return [f.x + f.width, f.y + f.height];
    })
    .toEqual([
      expect.closeTo(corner.x + corner.width, 0),
      expect.closeTo(corner.y + corner.height, 0),
    ]);
});

test('the minimap goes away when hidden beats make the board fit', async ({
  page,
  request,
}) => {
  const board = await startPlotOfSize(page, request, 8, 1);
  const minimap = page.getByTestId('plot-minimap');
  await expect(minimap).toBeVisible();
  const { maxLeft } = await boardScroll(board);
  await scrollBoardTo(board, maxLeft, 0);

  const hide = ['Show Middle', ...Array<string>(5).fill('Show Untitled beat')];
  for (const name of hide) {
    await page.getByRole('checkbox', { name, checked: true }).first().click();
  }
  await expect(board.getByRole('columnheader')).toHaveCount(2);
  await expect(minimap).toHaveCount(0);

  for (const name of hide) {
    await page.getByRole('checkbox', { name, checked: false }).first().click();
  }
  await expect(minimap).toBeVisible();

  // The scroll went back to the start while the board fitted.
  const frame = page.getByRole('group', { name: 'Board position' });
  const miniature = await box(page.getByTestId('plot-minimap-miniature'));
  expect((await boardScroll(board)).left).toBe(0);
  await expect
    .poll(async () => (await box(frame)).x)
    .toBeCloseTo(miniature.x, 0);
  await scrollBoardTo(board, maxLeft, 0);
  await expect
    .poll(async () => {
      const f = await box(frame);
      return f.x + f.width;
    })
    .toBeCloseTo(miniature.x + miniature.width, 0);
});
