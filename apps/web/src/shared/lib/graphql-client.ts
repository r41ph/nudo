import { GraphQLClient, ClientError } from 'graphql-request';
import { API_URL } from '@web/shared/lib/api';
import { getToken, clearAuth } from '@web/shared/lib/auth';

// A 401 means the stored token is dead (expired or rotated secret); bouncing
// to login beats an authenticated-looking screen whose queries return nothing.
// Guarded on getToken() so it can't loop once logged out.
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
