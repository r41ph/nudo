import type { Meta, StoryObj, Decorator } from '@storybook/react-vite';
import { Provider, createStore } from 'jotai';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WordCountStrip } from '@web/features/document/components/word-count-strip';
import {
  currentDocumentAtom,
  liveWordCountAtom,
} from '@web/features/document/state/document.store';

const DOC_ID = '00000000-0000-0000-0000-000000000003';

const DOCUMENTS = {
  allDocuments: {
    nodes: [
      { id: DOC_ID, wordCount: 1820 },
      { id: '00000000-0000-0000-0000-000000000004', wordCount: 640 },
    ],
  },
};

// Seeds the query cache and atoms so the counts render without a network.
function withCounts(baseline: number | null): Decorator {
  return function WithCounts(Story) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity, retry: false } },
    });
    queryClient.setQueryData(['documents'], DOCUMENTS);

    const store = createStore();
    if (baseline !== null) {
      store.set(currentDocumentAtom, {
        id: DOC_ID,
        title: 'The Tidewatch',
        content: [],
        wordCount: 1820,
      });
      store.set(liveWordCountAtom, { documentId: DOC_ID, count: 1820 });
      try {
        const day = new Date().toISOString().slice(0, 10);
        localStorage.setItem(
          `nudo:word-baseline:${DOC_ID}:${day}`,
          String(baseline)
        );
      } catch {
        // Storage unavailable: the delta renders as 0, still a valid story.
      }
    }

    return (
      <QueryClientProvider client={queryClient}>
        <Provider store={store}>
          <div className="w-[860px] bg-background pt-10">
            <Story />
          </div>
        </Provider>
      </QueryClientProvider>
    );
  };
}

const meta = {
  title: 'Document/WordCountStrip',
  component: WordCountStrip,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof WordCountStrip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WrittenToday: Story = { decorators: [withCounts(1208)] };

export const NothingYetToday: Story = { decorators: [withCounts(1820)] };

export const NoDocumentOpen: Story = { decorators: [withCounts(null)] };
