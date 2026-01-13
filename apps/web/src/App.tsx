import { Layout } from '@web/components/layout/layout';
import { MainEditor } from '@writing-app/ui/src/components/main-editor/main-editor';

function App() {
  return (
    <div className="app">
      <Layout>
        <MainEditor />
      </Layout>
    </div>
  );
}

export default App;
