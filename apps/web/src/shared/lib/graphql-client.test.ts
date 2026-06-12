import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { graphql, HttpResponse } from 'msw';
import { server } from '@web/test/mocks/server';
import { graphqlClient } from '@web/shared/lib/graphql-client';
import { GET_DOCUMENTS } from '@web/features/document/api/document.api';
import { getToken, setToken } from '@web/shared/lib/auth';

describe('graphqlClient auth-failure handling', () => {
  const originalLocation = window.location;
  let assign: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setToken('stale-token');
    assign = vi.fn();
    // jsdom's window.location isn't spy-able, so replace it with a stub that
    // records navigation. pathname '/' ensures the redirect guard fires.
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { pathname: '/', assign },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
    localStorage.clear();
  });

  it('clears the stale token and redirects to /login on 401', async () => {
    server.use(
      graphql.query('GetDocuments', () =>
        HttpResponse.json(
          { errors: [{ message: 'Invalid or expired token' }] },
          { status: 401 }
        )
      )
    );

    await expect(graphqlClient.request(GET_DOCUMENTS)).rejects.toThrow();

    expect(getToken()).toBeNull();
    expect(assign).toHaveBeenCalledWith('/login');
  });

  it('leaves the session intact on a non-401 error', async () => {
    server.use(
      graphql.query('GetDocuments', () =>
        HttpResponse.json({ errors: [{ message: 'boom' }] }, { status: 500 })
      )
    );

    await expect(graphqlClient.request(GET_DOCUMENTS)).rejects.toThrow();

    expect(getToken()).toBe('stale-token');
    expect(assign).not.toHaveBeenCalled();
  });
});
