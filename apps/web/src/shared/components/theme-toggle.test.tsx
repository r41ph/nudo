import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeToggle } from '@web/shared/components/theme-toggle';
import { renderWithProviders, createStore } from '@web/test/test-utils';
import { themeAtom } from '@web/shared/state/theme.atom';

function mockMatchMedia(matches: boolean) {
  const listeners: (() => void)[] = [];
  return vi.fn().mockReturnValue({
    matches,
    addEventListener: vi.fn((_: string, cb: () => void) => listeners.push(cb)),
    removeEventListener: vi.fn(),
  });
}

beforeEach(() => {
  document.documentElement.classList.remove('dark');
});

afterEach(() => {
  document.documentElement.classList.remove('dark');
  vi.restoreAllMocks();
});

describe('ThemeToggle', () => {
  it('renders the switch', () => {
    window.matchMedia = mockMatchMedia(false);
    renderWithProviders(<ThemeToggle />);
    expect(
      screen.getByRole('switch', { name: /toggle dark mode/i })
    ).toBeInTheDocument();
  });

  it('clicking switch when light switches to dark and adds .dark class', async () => {
    window.matchMedia = mockMatchMedia(false);
    const store = createStore();
    store.set(themeAtom, 'light');

    renderWithProviders(<ThemeToggle />, { store });

    expect(document.documentElement.classList.contains('dark')).toBe(false);
    await userEvent.click(screen.getByRole('switch'));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('clicking switch when dark switches to light and removes .dark class', async () => {
    window.matchMedia = mockMatchMedia(false);
    const store = createStore();
    store.set(themeAtom, 'dark');

    renderWithProviders(<ThemeToggle />, { store });

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    await userEvent.click(screen.getByRole('switch'));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('applies .dark class on mount when system preference is dark', () => {
    window.matchMedia = mockMatchMedia(true);
    const store = createStore();
    store.set(themeAtom, 'system');

    renderWithProviders(<ThemeToggle />, { store });

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('does not apply .dark class on mount when system preference is light', () => {
    window.matchMedia = mockMatchMedia(false);
    const store = createStore();
    store.set(themeAtom, 'system');

    renderWithProviders(<ThemeToggle />, { store });

    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
