import AppRoutes from '@web/app/routes/router';
import { Toaster } from 'sonner';
import { useApplyTheme } from '@web/shared/hooks/use-theme';

function App() {
  useApplyTheme();

  return (
    <>
      <AppRoutes />
      <Toaster
        position="top-center"
        toastOptions={{
          classNames: {
            error: '!text-red-600 border-red-200',
          },
        }}
      />
    </>
  );
}

export default App;
