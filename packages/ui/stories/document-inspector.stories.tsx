import type { Meta, StoryObj } from '@storybook/react-vite';
import { Provider, createStore } from 'jotai';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DocumentInspector } from '@web/features/document/components/document-inspector';
import type { DocumentDetails } from '@web/features/document/document.types';
import {
  inspectorFocusRequestedAtom,
  openInspectorAtom,
} from '@web/shared/state/panels.atom';

const DOC: DocumentDetails = {
  id: '00000000-0000-0000-0000-000000000003',
  title: 'The Arrival',
  kind: 'document',
  status: 'drafting',
  summary:
    'Mara arrives in Lisbon and discovers the apartment has been broken into.',
  pov: 'Mara',
  createdAt: '2025-09-12T10:24:00Z',
  updatedAt: '2025-09-15T14:03:00Z',
};

const meta = {
  title: 'Document/DocumentInspector',
  component: DocumentInspector,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => {
      const store = createStore();
      store.set(openInspectorAtom);
      // Resting state: without this the panel focuses its tab on load.
      store.set(inspectorFocusRequestedAtom, false);
      // Seeds the outline so POV suggestions render without a network.
      const queryClient = new QueryClient({
        defaultOptions: { queries: { staleTime: Infinity, retry: false } },
      });
      queryClient.setQueryData(['outline'], {
        allDocuments: {
          nodes: ['Mara', 'Mara', 'Teo', 'Inès'].map((pov, i) => ({
            id: `n${i}`,
            title: 'Scene',
            parentId: null,
            position: i,
            kind: 'document',
            status: null,
            wordCount: 0,
            pov,
          })),
        },
      });
      return (
        <QueryClientProvider client={queryClient}>
          <Provider store={store}>
            <div className="h-[640px] w-[336px] border-l border-border bg-background">
              <Story />
            </div>
          </Provider>
        </QueryClientProvider>
      );
    },
  ],
  args: { details: DOC },
} satisfies Meta<typeof DocumentInspector>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Document: Story = {};

export const EmptyFields: Story = {
  args: { details: { ...DOC, status: null, summary: '', pov: '' } },
};

export const Folder: Story = {
  args: { details: { ...DOC, kind: 'folder', title: 'Chapter One' } },
};

export const Separator: Story = {
  args: { details: { ...DOC, kind: 'separator', title: 'Part One' } },
};
