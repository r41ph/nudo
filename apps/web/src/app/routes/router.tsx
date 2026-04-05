import { lazy, Suspense } from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import { AppLayout } from '@web/layouts/app-layout';
import { WorkspaceLayout } from '@web/layouts/workspace-layout';
import { LoginPage } from '@web/features/auth/components/login-page';

const DocumentPage = lazy(() =>
  import('@web/features/document/components/document-page').then((m) => ({
    default: m.DocumentPage,
  }))
);

const HomePage = lazy(() =>
  import('@web/features/home/components/home-page').then((m) => ({
    default: m.HomePage,
  }))
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

export default function AppRoutes() {
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
