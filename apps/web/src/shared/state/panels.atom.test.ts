import { describe, it, expect } from 'vitest';
import { createStore } from 'jotai';
import {
  closeInspectorAtom,
  consumeInspectorFocusAtom,
  inspectorAtom,
  inspectorFocusRequestedAtom,
  openInspectorAtom,
  outlineOpenAtom,
  setInspectorCollapsedAtom,
  setOutlineOpenAtom,
} from '@web/shared/state/panels.atom';

const CLOSED = { isOpen: false, collapsed: false, tab: 'details' };

describe('inspectorAtom', () => {
  it('starts closed on the Details tab', () => {
    const store = createStore();

    expect(store.get(inspectorAtom)).toEqual(CLOSED);
  });

  it('opens expanded on the Details tab', () => {
    const store = createStore();

    store.set(openInspectorAtom);

    expect(store.get(inspectorAtom)).toEqual({
      isOpen: true,
      collapsed: false,
      tab: 'details',
    });
  });

  it('re-opening a collapsed panel expands it', () => {
    const store = createStore();
    store.set(openInspectorAtom);
    store.set(setInspectorCollapsedAtom, true);

    store.set(openInspectorAtom);

    expect(store.get(inspectorAtom).collapsed).toBe(false);
  });

  it('collapses and expands without closing', () => {
    const store = createStore();
    store.set(openInspectorAtom);

    store.set(setInspectorCollapsedAtom, true);
    expect(store.get(inspectorAtom)).toMatchObject({
      isOpen: true,
      collapsed: true,
    });

    store.set(setInspectorCollapsedAtom, false);
    expect(store.get(inspectorAtom)).toMatchObject({
      isOpen: true,
      collapsed: false,
    });
  });

  it('ignores collapse while closed', () => {
    const store = createStore();

    store.set(setInspectorCollapsedAtom, true);

    expect(store.get(inspectorAtom)).toEqual(CLOSED);
  });

  it('closing clears the collapsed flag', () => {
    const store = createStore();
    store.set(openInspectorAtom);
    store.set(setInspectorCollapsedAtom, true);

    store.set(closeInspectorAtom);

    expect(store.get(inspectorAtom)).toEqual(CLOSED);
  });
});

describe('outlineOpenAtom', () => {
  it('starts collapsed for the narrow layout', () => {
    const store = createStore();

    expect(store.get(outlineOpenAtom)).toBe(false);
  });
});

// Below the breakpoint only one panel fits. The rule holds at every width
// because above it both flags are ignored, so it can live here instead of in a
// viewport-aware hook that the outline's own Details action would bypass.
describe('mutual exclusion', () => {
  it('opening the inspector collapses the outline', () => {
    const store = createStore();
    store.set(setOutlineOpenAtom, true);

    store.set(openInspectorAtom);

    expect(store.get(outlineOpenAtom)).toBe(false);
  });

  it('expanding a collapsed inspector collapses the outline', () => {
    const store = createStore();
    store.set(openInspectorAtom);
    store.set(setInspectorCollapsedAtom, true);
    store.set(setOutlineOpenAtom, true);

    store.set(setInspectorCollapsedAtom, false);

    expect(store.get(outlineOpenAtom)).toBe(false);
  });

  it('opening the outline collapses an open inspector without closing it', () => {
    const store = createStore();
    store.set(openInspectorAtom);

    store.set(setOutlineOpenAtom, true);

    expect(store.get(outlineOpenAtom)).toBe(true);
    expect(store.get(inspectorAtom)).toMatchObject({
      isOpen: true,
      collapsed: true,
    });
  });

  it('opening the outline leaves a closed inspector closed', () => {
    const store = createStore();

    store.set(setOutlineOpenAtom, true);

    expect(store.get(inspectorAtom)).toEqual(CLOSED);
  });

  it('closing the outline leaves the inspector alone', () => {
    const store = createStore();
    store.set(openInspectorAtom);
    store.set(setOutlineOpenAtom, true);

    store.set(setOutlineOpenAtom, false);

    expect(store.get(inspectorAtom).collapsed).toBe(true);
  });
});

// The panel remounts on every document switch, so "focus Title on open" can't
// be keyed to mount: switching documents must leave focus in the outline.
describe('inspector focus request', () => {
  it('is raised by opening and cleared once consumed', () => {
    const store = createStore();
    expect(store.get(inspectorFocusRequestedAtom)).toBe(false);

    store.set(openInspectorAtom);
    expect(store.get(inspectorFocusRequestedAtom)).toBe(true);

    store.set(consumeInspectorFocusAtom);
    expect(store.get(inspectorFocusRequestedAtom)).toBe(false);
  });

  it('is raised again when Details is chosen while already open', () => {
    const store = createStore();
    store.set(openInspectorAtom);
    store.set(consumeInspectorFocusAtom);

    store.set(openInspectorAtom);

    expect(store.get(inspectorFocusRequestedAtom)).toBe(true);
  });

  it('is dropped when the panel closes', () => {
    const store = createStore();
    store.set(openInspectorAtom);

    store.set(closeInspectorAtom);

    expect(store.get(inspectorFocusRequestedAtom)).toBe(false);
  });
});
