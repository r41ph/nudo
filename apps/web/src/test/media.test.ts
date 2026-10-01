import { describe, it, expect, vi } from 'vitest';
import { DEFAULT_VIEWPORT_WIDTH, setViewportWidth } from '@web/test/media';

describe('matchMedia test double', () => {
  it('defaults to a desktop viewport', () => {
    expect(window.innerWidth).toBe(DEFAULT_VIEWPORT_WIDTH);
    expect(window.matchMedia('(min-width: 1280px)').matches).toBe(true);
    expect(window.matchMedia('(max-width: 767px)').matches).toBe(false);
  });

  it('reports light theme and motion allowed', () => {
    expect(window.matchMedia('(prefers-color-scheme: dark)').matches).toBe(
      false
    );
    expect(window.matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(
      false
    );
  });

  it('evaluates combined min/max ranges', () => {
    setViewportWidth(1024);

    expect(
      window.matchMedia('(min-width: 768px) and (max-width: 1279px)').matches
    ).toBe(true);
  });

  it('notifies listeners only when a query flips', () => {
    const mql = window.matchMedia('(min-width: 1280px)');
    const listener = vi.fn();
    mql.addEventListener('change', listener);

    setViewportWidth(1300);
    expect(listener).not.toHaveBeenCalled();

    setViewportWidth(1024);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].matches).toBe(false);
    expect(mql.matches).toBe(false);
    expect(window.innerWidth).toBe(1024);
  });

  it('stops notifying removed listeners', () => {
    const mql = window.matchMedia('(min-width: 1280px)');
    const listener = vi.fn();
    mql.addEventListener('change', listener);
    mql.removeEventListener('change', listener);

    setViewportWidth(800);

    expect(listener).not.toHaveBeenCalled();
  });

  // Runs after the width changes above: proves setup resets per test.
  it('starts every test back at the default width', () => {
    expect(window.innerWidth).toBe(DEFAULT_VIEWPORT_WIDTH);
    expect(window.matchMedia('(min-width: 1280px)').matches).toBe(true);
  });
});
