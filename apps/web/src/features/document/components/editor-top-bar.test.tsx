import { describe, it, expect } from 'vitest';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore } from 'jotai';
import { renderWithProviders } from '@web/test/test-utils';
import { setViewportWidth } from '@web/test/media';
import { EditorTopBar } from '@web/features/document/components/editor-top-bar';
import {
  INSPECTOR_PANEL_ID,
  OUTLINE_PANEL_ID,
} from '@web/shared/constants/panels.constants';
import { isFocusModeAtom } from '@web/shared/state/focus-mode.atom';
import {
  closeInspectorAtom,
  inspectorAtom,
  openInspectorAtom,
  outlineOpenAtom,
} from '@web/shared/state/panels.atom';

function renderTopBar(store = createStore()) {
  renderWithProviders(<EditorTopBar />, { store });
  return store;
}

const outlineToggle = () =>
  screen.queryByRole('button', { name: /(show|hide) outline/i });
const detailsToggle = () =>
  screen.queryByRole('button', { name: /(show|hide) details/i });

describe('EditorTopBar — panel toggles at or above 1280px', () => {
  it('renders neither toggle, even with the inspector open', () => {
    const store = createStore();
    store.set(openInspectorAtom);
    renderTopBar(store);

    expect(outlineToggle()).toBeNull();
    expect(detailsToggle()).toBeNull();
  });
});

describe('EditorTopBar — panel toggles below 1280px', () => {
  it('offers the outline toggle, collapsed, pointing at its panel', () => {
    setViewportWidth(1024);
    renderTopBar();

    const toggle = screen.getByRole('button', { name: 'Show outline' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAttribute('aria-controls', OUTLINE_PANEL_ID);
  });

  it('opens and closes the outline', async () => {
    setViewportWidth(1024);
    const user = userEvent.setup();
    const store = renderTopBar();

    await user.click(screen.getByRole('button', { name: 'Show outline' }));
    expect(store.get(outlineOpenAtom)).toBe(true);
    expect(
      screen.getByRole('button', { name: 'Hide outline' })
    ).toHaveAttribute('aria-expanded', 'true');

    await user.click(screen.getByRole('button', { name: 'Hide outline' }));
    expect(store.get(outlineOpenAtom)).toBe(false);
  });

  it('offers no details toggle until the inspector is open', () => {
    setViewportWidth(1024);
    const store = renderTopBar();
    expect(detailsToggle()).toBeNull();

    act(() => store.set(openInspectorAtom));
    const toggle = screen.getByRole('button', { name: 'Hide details' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAttribute('aria-controls', INSPECTOR_PANEL_ID);

    act(() => store.set(closeInspectorAtom));
    expect(detailsToggle()).toBeNull();
  });

  it('collapses the inspector without closing it, and brings it back', async () => {
    setViewportWidth(1024);
    const user = userEvent.setup();
    const store = createStore();
    store.set(openInspectorAtom);
    renderTopBar(store);

    await user.click(screen.getByRole('button', { name: 'Hide details' }));
    expect(store.get(inspectorAtom)).toMatchObject({
      isOpen: true,
      collapsed: true,
    });

    await user.click(screen.getByRole('button', { name: 'Show details' }));
    expect(store.get(inspectorAtom).collapsed).toBe(false);
  });

  it('hides both toggles in focus mode, where neither panel renders', () => {
    setViewportWidth(1024);
    const store = createStore();
    store.set(openInspectorAtom);
    store.set(isFocusModeAtom, true);
    renderTopBar(store);

    expect(outlineToggle()).toBeNull();
    expect(detailsToggle()).toBeNull();
  });
});
