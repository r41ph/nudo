import { useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { UPDATE_USER_TOOLBAR } from '@web/graphql/mutations';
import { graphqlClient } from '@web/lib/graphql-client';

export function useToolbarSettingsSync(
  userId: string | null,
  enabledTools: string[],
  toolbarType?: string
) {
  const { mutate: updateToolbar } = useMutation({
    mutationFn: (variables: {
      enabledTools: string[];
      toolbarType?: string;
    }) => graphqlClient.request(UPDATE_USER_TOOLBAR, variables),
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialRef = useRef(true);

  useEffect(() => {
    // Skip the initial mount
    if (initialRef.current) {
      initialRef.current = false;
      return;
    }
    if (!userId) return;

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
  }, [userId, enabledTools, toolbarType, updateToolbar]);
}
