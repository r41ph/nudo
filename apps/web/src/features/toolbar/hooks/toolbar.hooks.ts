import { useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAtomValue, useSetAtom } from 'jotai';
import {
  GET_CURRENT_USER,
  UPDATE_USER_TOOLBAR,
} from '@web/features/toolbar/api/toolbar.api';
import { graphqlClient } from '@web/shared/lib/graphql-client';
import {
  userAtom,
  isAuthenticatedAtom,
} from '@web/features/auth/state/auth.store';
import { enabledToolsAtom } from '@web/features/toolbar/state/toolbar.store';
import type { ToolbarToolName } from '@web/features/toolbar/toolbar.types';

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
    queryFn: () =>
      graphqlClient.request<UserData>(GET_CURRENT_USER, { id: user!.id }),
    enabled: isAuthenticated && !!user?.id,
  });

  useEffect(() => {
    const prefs = data?.userById;
    if (prefs?.enabledTools) {
      setEnabledTools(prefs.enabledTools as ToolbarToolName[]);
    }
  }, [data, setEnabledTools]);

  // Derived: server preferences have been received and pushed into the atom.
  // useToolbarSettingsSync gates on this to avoid writing the atom's default
  // value back to the database on mount (esp. under StrictMode).
  const isHydrated = !!data?.userById?.enabledTools;

  return { isLoading, isHydrated };
}

export function useToolbarSettingsSync(
  userId: string | null,
  enabledTools: ToolbarToolName[],
  isHydrated: boolean,
  toolbarType?: string
) {
  const { mutate: updateToolbar } = useMutation({
    mutationFn: (variables: {
      enabledTools: ToolbarToolName[];
      toolbarType?: string;
    }) => graphqlClient.request(UPDATE_USER_TOOLBAR, variables),
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Only sync after server preferences have been loaded into the atom.
    // Using a ref-based "skip first render" flag is not reliable in StrictMode
    // because refs persist across the simulated unmount/remount, causing the
    // atom's default value to be written to the database on mount.
    if (!isHydrated || !userId) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      updateToolbar({
        enabledTools,
        ...(toolbarType !== undefined ? { toolbarType } : {}),
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [userId, enabledTools, toolbarType, isHydrated, updateToolbar]);
}
