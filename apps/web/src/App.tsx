import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import { useQuery, useMutation } from '@tanstack/react-query';
import { isAuthenticatedAtom } from '@web/state/auth.atom';
import { GET_DOCUMENTS } from '@web/graphql/queries';
import { CREATE_DOCUMENT } from '@web/graphql/mutations';
import { graphqlClient } from '@web/lib/graphql-client';
import { queryClient } from '@web/lib/query-client';
import { LoginPage } from '@web/components/auth/login-page';
import { DocumentPage } from '@web/components/document/document-page';
import { Layout } from '@web/components/layout/layout';
import { Button } from '@ui/components/ui/button';
import { PlusIcon } from 'lucide-react';

function HomeRedirect() {
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

  const handleCreateDocument = () => {
    const defaultContent = [{ type: 'p', children: [{ text: '' }] }];
    createDocument({ title: 'Untitled Document', content: defaultContent });
  };

  if (!isAuthenticated) return <Navigate to="/login" />;
  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-64 items-center justify-center text-gray-500">
          Loading...
        </div>
      </Layout>
    );
  }

  const docs = data?.allDocuments?.nodes;
  if (docs && docs.length > 0) {
    return <Navigate to={`/document/${docs[0].id}`} />;
  }

  return (
    <Layout>
      <div className="flex flex-col h-64 items-center justify-center gap-4">
        <p className="text-gray-500">No documents yet. Create one to get started.</p>
        <Button onClick={handleCreateDocument} disabled={creating}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Create Your First Document
        </Button>
      </div>
    </Layout>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/document/:id" element={<DocumentPage />} />
      <Route path="/" element={<HomeRedirect />} />
    </Routes>
  );
}

export default App;
