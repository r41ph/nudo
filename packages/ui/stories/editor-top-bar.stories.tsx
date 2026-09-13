import type { Meta, StoryObj, Decorator } from '@storybook/react-vite';
import { Provider, createStore } from 'jotai';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EditorTopBar } from '@web/features/document/components/editor-top-bar';
import {
  currentDocumentAtom,
  liveWordCountAtom,
} from '@web/features/document/state/document.store';
import { saveStatusAtom } from '@web/shared/state/save-status.atom';

const PART_ID = '00000000-0000-0000-0000-000000000001';
const DOC_ID = '00000000-0000-0000-0000-000000000003';

const OUTLINE = {
  allDocuments: {
    nodes: [
      {
        id: PART_ID,
        title: 'Part I',
        parentId: null,
        position: 0,
        kind: 'folder' as const,
        status: null,
        wordCount: 0,
      },
      {
        id: DOC_ID,
        title: 'The Tidewatch',
        parentId: PART_ID,
        position: 0,
        kind: 'document' as const,
        status: 'drafting' as const,
        wordCount: 1820,
      },
    ],
  },
};

// Seeds the query cache and atoms so the bar renders without a network.
const withEditorContext: Decorator = (Story) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } },
  });
  queryClient.setQueryData(['outline'], OUTLINE);

  const store = createStore();
  store.set(currentDocumentAtom, {
    id: DOC_ID,
    title: 'The Tidewatch',
    content: [],
    wordCount: 1820,
  });
  store.set(liveWordCountAtom, { documentId: DOC_ID, count: 1820 });
  store.set(saveStatusAtom, 'saved');

  try {
    const day = new Date().toISOString().slice(0, 10);
    localStorage.setItem(`nudo:word-baseline:${DOC_ID}:${day}`, '1208');
  } catch {
    // Storage unavailable: the delta renders as +0, which is still a valid story.
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <Story />
      </Provider>
    </QueryClientProvider>
  );
};

const meta = {
  title: 'Editor/EditorTopBar',
  component: EditorTopBar,
  parameters: { layout: 'fullscreen' },
  decorators: [withEditorContext],
} satisfies Meta<typeof EditorTopBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
