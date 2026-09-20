import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { useAuth } from '@web/features/auth/hooks/use-auth';
import { renderHookWithProviders } from '@web/test/test-utils';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('useAuth', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('drops queries cached before login so the new session refetches', async () => {
    const { result, queryClient } = renderHookWithProviders(() => useAuth());
    // The test client's gcTime of 0 would otherwise evict the seed before
    // the assertion and make this pass without clear().
    queryClient.setQueryDefaults(['documents'], { gcTime: Infinity });
    // What an anonymous request returns: RLS yields no rows, not an error.
    queryClient.setQueryData(['documents'], { allDocuments: { nodes: [] } });

    await act(async () => {
      result.current.login.mutate({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'));
    expect(queryClient.getQueryData(['documents'])).toBeUndefined();
  });
});
