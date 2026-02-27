import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAtomValue, useSetAtom } from 'jotai';
import { GET_CURRENT_USER } from '@web/graphql/queries';
import { graphqlClient } from '@web/lib/graphql-client';
import { userAtom, isAuthenticatedAtom } from '@web/state/auth.atom';
import { enabledToolsAtom } from '@web/state/toolbar.atom';

interface UserData {
  userById: {
    id: string;
    enabledTools: string[];
    toolbarType: string;
  } | null;
}

export function useUserPreferences() {
  const user = useAtomValue(userAtom);
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const setEnabledTools = useSetAtom(enabledToolsAtom);

  const { data, isLoading } = useQuery({
    queryKey: ['currentUser', user?.id],
    queryFn: () => graphqlClient.request<UserData>(GET_CURRENT_USER, { id: user!.id }),
    enabled: isAuthenticated && !!user?.id,
  });

  useEffect(() => {
    const prefs = data?.userById;
    if (prefs?.enabledTools) {
      setEnabledTools(prefs.enabledTools);
    }
  }, [data, setEnabledTools]);

  return { isLoading };
}
