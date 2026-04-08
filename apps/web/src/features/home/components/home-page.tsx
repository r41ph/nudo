import { useCallback } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import { useQuery, useMutation } from '@tanstack/react-query';
import { isAuthenticatedAtom } from '@web/features/auth/state/auth.store';
import { GET_DOCUMENTS, CREATE_DOCUMENT } from '@web/features/document/api/document.api';
import { graphqlClient } from '@web/shared/lib/graphql-client';
import { queryClient } from '@web/shared/lib/query-client';
import { Button } from '@ui/components/ui/button';
import { PlusIcon } from 'lucide-react';

export function HomePage() {
  const navigate = useNavigate();
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);

  const { data, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () =>
      graphqlClient.request<{
        allDocuments: { nodes: Array<{ id: string; title: string }> };
      }>(GET_DOCUMENTS),
    enabled: isAuthenticated,
  });

  const { mutate: createDocument, isPending: creating } = useMutation({
    mutationFn: (variables: { title: string; content: unknown }) =>
      graphqlClient.request<{
        createNewDocument: { document: { id: string } };
      }>(CREATE_DOCUMENT, variables),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      navigate(`/document/${data.createNewDocument.document.id}`);
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

  const docs = data?.allDocuments?.nodes;
  if (docs && docs.length > 0) {
    return <Navigate to={`/document/${docs[0].id}`} />;
  }

  return (
    <div className="flex flex-col h-64 items-center justify-center gap-4">
      <p className="text-gray-500">No documents yet. Create one to get started.</p>
      <Button onClick={handleCreateDocument} disabled={creating}>
        <PlusIcon className="h-4 w-4 mr-2" />
        Create Your First Document
      </Button>
    </div>
  );
}
