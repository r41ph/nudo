import type { Locator, Page } from '@playwright/test';

/**
 * Drive a native HTML5 drag-and-drop. Playwright's mouse APIs don't fire the
 * browser's native drag events that headless-tree relies on, so we dispatch the
 * drag lifecycle manually with one shared DataTransfer. clientY is aimed near
 * the top of the target so headless-tree drops the source *before* it.
 */
export async function dragBefore(
  page: Page,
  source: Locator,
  target: Locator
): Promise<void> {
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
  const box = await target.boundingBox();
  if (!box) throw new Error('drag target has no bounding box');
  const at = { clientX: box.x + box.width / 2, clientY: box.y + 2 };

  await source.dispatchEvent('dragstart', { dataTransfer });
  await target.dispatchEvent('dragenter', { dataTransfer });
  await target.dispatchEvent('dragover', { dataTransfer, ...at });
  await target.dispatchEvent('drop', { dataTransfer, ...at });
  await source.dispatchEvent('dragend', { dataTransfer });
}

/**
 * Drive a dnd-kit pointer drag from the centre of `source` to the centre of
 * `target`. Unlike headless-tree, dnd-kit listens to pointer events, which
 * Playwright's mouse does fire.
 */
export async function pointerDrag(
  page: Page,
  source: Locator,
  target: Locator
): Promise<void> {
  const from = await source.boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) throw new Error('drag source or target has no box');
  const start = { x: from.x + from.width / 2, y: from.y + from.height / 2 };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  // dnd-kit starts a pointer drag only after 6px of movement.
  await page.mouse.move(start.x + 10, start.y + 10, { steps: 3 });
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, {
    steps: 10,
  });
  await page.mouse.up();
}
