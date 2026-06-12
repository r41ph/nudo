import { GraphQLClient, ClientError } from 'graphql-request';
import { API_URL } from '@web/shared/lib/api';
import { getToken, clearAuth } from '@web/shared/lib/auth';

/**
 * When the API rejects our credential (401 — token expired, or signed with a
 * since-rotated secret), the stored token is useless. Clear it and bounce to
 * login rather than leaving the user on an authenticated-looking screen whose
 * queries silently return nothing. Guarded on getToken() so we never loop when
 * already logged out, and skipped if we're already on the login route.
 */
function handleAuthFailure(response: unknown): void {
  const status =
    response instanceof ClientError ? response.response.status : undefined;
  if (status !== 401 || !getToken()) return;

  clearAuth();
  if (window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
}

export const graphqlClient = new GraphQLClient(`${API_URL}/graphql`, {
  headers: () => {
    const token = getToken();
    return token
      ? { authorization: `Bearer ${token}` }
      : ({} as Record<string, string>);
  },
  responseMiddleware: (response) => {
    if (response instanceof Error) handleAuthFailure(response);
  },
});
