import { GraphQLClient } from 'graphql-request';
import { API_URL } from '@web/shared/lib/api';
import { getToken } from '@web/shared/lib/auth';

export const graphqlClient = new GraphQLClient(`${API_URL}/graphql`, {
  headers: () => {
    const token = getToken();
    return token
      ? { authorization: `Bearer ${token}` }
      : ({} as Record<string, string>);
  },
});
