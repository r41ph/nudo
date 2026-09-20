import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import { useApplyTheme, useDarkMode } from '@web/shared/hooks/use-theme';
import { renderHookWithProviders, createStore } from '@web/test/test-utils';
import { themeAtom } from '@web/shared/state/theme.atom';

function mockMatchMedia(matches: boolean) {
  return vi.fn().mockReturnValue({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
}

const hasDarkClass = () => document.documentElement.classList.contains('dark');

beforeEach(() => {
  document.documentElement.classList.remove('dark');
});

afterEach(() => {
  document.documentElement.classList.remove('dark');
  vi.restoreAllMocks();
});

describe('useApplyTheme', () => {
  it('adds .dark when the stored theme is dark', () => {
    window.matchMedia = mockMatchMedia(false);
    const store = createStore();
    store.set(themeAtom, 'dark');

    renderHookWithProviders(() => useApplyTheme(), { store });

    expect(hasDarkClass()).toBe(true);
  });

  it('removes .dark when the stored theme is light', () => {
    window.matchMedia = mockMatchMedia(true);
    document.documentElement.classList.add('dark');
    const store = createStore();
    store.set(themeAtom, 'light');

    renderHookWithProviders(() => useApplyTheme(), { store });

    expect(hasDarkClass()).toBe(false);
  });

  it('follows the system preference when the theme is system', () => {
    window.matchMedia = mockMatchMedia(true);
    const store = createStore();
    store.set(themeAtom, 'system');

    renderHookWithProviders(() => useApplyTheme(), { store });

    expect(hasDarkClass()).toBe(true);
  });

  it('re-applies when the theme atom changes', () => {
    window.matchMedia = mockMatchMedia(false);
    const store = createStore();
    store.set(themeAtom, 'light');

    renderHookWithProviders(() => useApplyTheme(), { store });
    expect(hasDarkClass()).toBe(false);

    act(() => store.set(themeAtom, 'dark'));

    expect(hasDarkClass()).toBe(true);
  });
});

describe('useDarkMode', () => {
  it('resolves system to the OS preference', () => {
    window.matchMedia = mockMatchMedia(true);
    const store = createStore();
    store.set(themeAtom, 'system');

    const { result } = renderHookWithProviders(() => useDarkMode(), { store });

    expect(result.current.isDark).toBe(true);
  });

  it('writes an explicit theme, never system', () => {
    window.matchMedia = mockMatchMedia(false);
    const store = createStore();
    store.set(themeAtom, 'system');

    const { result } = renderHookWithProviders(() => useDarkMode(), { store });

    act(() => result.current.setDark(true));
    expect(store.get(themeAtom)).toBe('dark');
    expect(result.current.isDark).toBe(true);

    act(() => result.current.setDark(false));
    expect(store.get(themeAtom)).toBe('light');
    expect(result.current.isDark).toBe(false);
  });
});
