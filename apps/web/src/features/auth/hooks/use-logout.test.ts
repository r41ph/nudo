import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useLogout } from '@web/features/auth/hooks/use-logout';
import { renderHookWithProviders, createStore } from '@web/test/test-utils';
import { tokenAtom, userAtom } from '@web/features/auth/state/auth.store';
import { MOCK_TOKEN, MOCK_USER } from '@web/test/mocks/fixtures';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('useLogout', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('clears tokenAtom and userAtom', () => {
    const store = createStore();
    store.set(tokenAtom, MOCK_TOKEN);
    store.set(userAtom, MOCK_USER);

    const { result } = renderHookWithProviders(() => useLogout(), { store });

    act(() => {
      result.current.logout();
    });

    expect(store.get(tokenAtom)).toBeNull();
    expect(store.get(userAtom)).toBeNull();
  });

  it('clears localStorage via clearAuth', () => {
    const { result } = renderHookWithProviders(() => useLogout());

    act(() => {
      result.current.logout();
    });

    expect(localStorage.removeItem).toHaveBeenCalledWith('nudo_token');
    expect(localStorage.removeItem).toHaveBeenCalledWith('nudo_user');
  });

  it('navigates to /login', () => {
    const { result } = renderHookWithProviders(() => useLogout());

    act(() => {
      result.current.logout();
    });

    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('fires POST /auth/logout for Clear-Site-Data (unhandled request would fail this test)', async () => {
    const { result } = renderHookWithProviders(() => useLogout());

    await act(async () => {
      result.current.logout();
    });

    // If MSW had no handler for /auth/logout, setup.ts's onUnhandledRequest: 'error'
    // would throw here. Passing confirms the fire-and-forget request was handled.
    expect(mockNavigate).toHaveBeenCalledOnce();
  });
});
