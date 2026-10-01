import { describe, it, expect } from 'vitest';
import { act } from '@testing-library/react';
import { usePanels } from '@web/shared/hooks/use-panels';
import {
  inspectorAtom,
  openInspectorAtom,
  setInspectorCollapsedAtom,
  setOutlineOpenAtom,
} from '@web/shared/state/panels.atom';
import { setViewportWidth } from '@web/test/media';
import { renderHookWithProviders } from '@web/test/test-utils';

describe('usePanels — at or above 1280px', () => {
  it('always shows the outline and offers no toggles', () => {
    const { result } = renderHookWithProviders(() => usePanels());

    expect(result.current).toMatchObject({
      isDesktop: true,
      outlineExpanded: true,
      inspectorExpanded: false,
      showOutlineToggle: false,
      showInspectorToggle: false,
    });
  });

  it('shows an open inspector even if it was collapsed while narrow', () => {
    const { result, store } = renderHookWithProviders(() => usePanels());
    act(() => {
      store.set(openInspectorAtom);
      store.set(setInspectorCollapsedAtom, true);
    });

    expect(result.current.inspectorExpanded).toBe(true);
    expect(result.current.showInspectorToggle).toBe(false);
  });
});

describe('usePanels — below 1280px', () => {
  it('starts with the outline collapsed and only its toggle offered', () => {
    setViewportWidth(1024);
    const { result } = renderHookWithProviders(() => usePanels());

    expect(result.current).toMatchObject({
      isDesktop: false,
      outlineExpanded: false,
      inspectorExpanded: false,
      showOutlineToggle: true,
      showInspectorToggle: false,
    });
  });

  // No persistent Details button: the inspector's toggle exists only while
  // the panel is open (expanded or collapsed), never before Details is chosen.
  it('offers the inspector toggle only once the inspector is open', () => {
    setViewportWidth(1024);
    const { result, store } = renderHookWithProviders(() => usePanels());

    act(() => store.set(openInspectorAtom));

    expect(result.current.inspectorExpanded).toBe(true);
    expect(result.current.showInspectorToggle).toBe(true);
  });

  it('toggling the outline open collapses the inspector, and back', () => {
    setViewportWidth(1024);
    const { result, store } = renderHookWithProviders(() => usePanels());
    act(() => store.set(openInspectorAtom));

    act(() => result.current.toggleOutline());
    expect(result.current.outlineExpanded).toBe(true);
    expect(result.current.inspectorExpanded).toBe(false);
    expect(result.current.showInspectorToggle).toBe(true);

    act(() => result.current.toggleInspector());
    expect(result.current.inspectorExpanded).toBe(true);
    expect(result.current.outlineExpanded).toBe(false);
  });

  it('toggling the inspector collapses it without closing it', () => {
    setViewportWidth(1024);
    const { result, store } = renderHookWithProviders(() => usePanels());
    act(() => store.set(openInspectorAtom));

    act(() => result.current.toggleInspector());

    expect(result.current.inspectorExpanded).toBe(false);
    expect(store.get(inspectorAtom).isOpen).toBe(true);
    expect(result.current.showInspectorToggle).toBe(true);
  });
});

describe('usePanels — crossing the breakpoint', () => {
  it('growing past 1280px shows both panels without any toggle', () => {
    setViewportWidth(1024);
    const { result, store } = renderHookWithProviders(() => usePanels());
    act(() => {
      store.set(openInspectorAtom);
      store.set(setOutlineOpenAtom, true);
    });
    expect(result.current.inspectorExpanded).toBe(false);

    act(() => setViewportWidth(1440));

    expect(result.current).toMatchObject({
      outlineExpanded: true,
      inspectorExpanded: true,
      showOutlineToggle: false,
      showInspectorToggle: false,
    });
  });

  // Derived, not synced: the narrow layout comes back exactly as it was left.
  it('shrinking back restores the narrow layout as the writer left it', () => {
    setViewportWidth(1024);
    const { result, store } = renderHookWithProviders(() => usePanels());
    act(() => {
      store.set(openInspectorAtom);
      store.set(setOutlineOpenAtom, true);
    });

    act(() => setViewportWidth(1440));
    act(() => setViewportWidth(1024));

    expect(result.current.outlineExpanded).toBe(true);
    expect(result.current.inspectorExpanded).toBe(false);
  });
});
