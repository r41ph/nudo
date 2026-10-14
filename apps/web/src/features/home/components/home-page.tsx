import { useCallback } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import { useQuery, useMutation } from '@tanstack/react-query';
import { isAuthenticatedAtom } from '@web/features/auth/state/auth.store';
import {
  GET_DOCUMENTS,
  CREATE_NODE,
  documentsQueryKey,
} from '@web/features/document/api/document.api';
import { useProjectId } from '@web/shared/hooks/use-project-id';
import { documentPath } from '@web/shared/lib/routes';
import {
  firstDocumentId,
  type HomeNode,
} from '@web/features/home/lib/first-document';
import { graphqlClient } from '@web/shared/lib/graphql-client';
import { queryClient } from '@web/shared/lib/query-client';
import { Button } from '@ui/components/ui/button';
import { PlusIcon } from 'lucide-react';

export function HomePage() {
  const navigate = useNavigate();
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const projectId = useProjectId();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: documentsQueryKey(projectId),
    queryFn: () =>
      graphqlClient.request<{
        allDocuments: { nodes: HomeNode[] };
      }>(GET_DOCUMENTS, { projectId }),
    enabled: isAuthenticated && !!projectId,
  });

  const {
    mutate: createDocument,
    isPending: creating,
    isError: createFailed,
  } = useMutation({
    mutationFn: (variables: { title: string; content: unknown }) =>
      graphqlClient.request<{
        createNode: { document: { id: string } };
      }>(CREATE_NODE, {
        projectId,
        kind: 'section',
        parentId: null,
        title: variables.title,
        content: variables.content,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['outline'] });
      navigate(documentPath(projectId!, data.createNode.document.id));
    },
  });

  const handleCreateDocument = useCallback(() => {
    createDocument({
      title: 'Untitled Document',
      content: [{ type: 'p', children: [{ text: '' }] }],
    });
  }, [createDocument]);

  if (!isAuthenticated) return <Navigate to="/login" />;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        Loading...
      </div>
    );
  }

  // Falling through to the empty state would wrongly say "no documents".
  if (isError) {
    return (
      <div
        role="alert"
        className="flex flex-col h-64 items-center justify-center gap-4"
      >
        <p className="text-destructive">
          We couldn&apos;t load your documents.{' '}
          {error instanceof Error ? error.message : 'Please try again.'}
        </p>
        <Button variant="outline" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const firstId = firstDocumentId(data?.allDocuments?.nodes ?? []);
  if (firstId) {
    return <Navigate to={documentPath(projectId!, firstId)} />;
  }

  return (
    <div className="flex flex-col h-64 items-center justify-center gap-4 w-full">
      <p className="text-gray-500">
        No documents yet. Create one to get started.
      </p>
      <Button onClick={handleCreateDocument} disabled={creating}>
        <PlusIcon className="h-4 w-4 mr-2" />
        Create Your First Document
      </Button>
      {createFailed && (
        <p role="alert" className="text-sm text-destructive">
          Couldn&apos;t create the document. Please try again.
        </p>
      )}
    </div>
  );
}
