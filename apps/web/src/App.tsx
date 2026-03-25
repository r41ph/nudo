import { lazy, Suspense } from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import { AppLayout } from '@web/components/layout/app-layout';
import { WorkspaceLayout } from '@web/components/layout/workspace-layout';
import { LoginPage } from '@web/components/auth/login-page';

const DocumentPage = lazy(() =>
  import('@web/components/document/document-page').then((m) => ({ default: m.DocumentPage }))
);

const HomePage = lazy(() =>
  import('@web/components/home-page/home-page').then((m) => ({ default: m.HomePage }))
);

function AppShell() {
  return (
    <AppLayout>
      <WorkspaceLayout>
        <Suspense>
          <Outlet />
        </Suspense>
      </WorkspaceLayout>
    </AppLayout>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<LoginPage />} />
      <Route element={<AppShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/document/:id" element={<DocumentPage />} />
      </Route>
    </Routes>
  );
}

export default App;
