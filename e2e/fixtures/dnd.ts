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
