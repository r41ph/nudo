import type { Meta, StoryObj } from '@storybook/react-vite';
import { within } from 'storybook/test';
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
  notes: '',
  createdAt: '2025-09-12T10:24:00Z',
  updatedAt: '2025-09-15T14:03:00Z',
};

type SaveOutcome = 'pending' | 'success' | 'failure';

// Storybook has no API, so the save's request is answered here. The client
// reads globalThis.fetch per request, which makes a swap enough.
const answerSaves = (outcome: SaveOutcome) => () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (_input, init) => {
    if (outcome === 'pending') return new Promise<Response>(() => {});
    if (outcome === 'failure') {
      return Response.json(
        { errors: [{ message: 'Save failed' }] },
        { status: 500 }
      );
    }
    const { variables } = JSON.parse(String(init?.body));
    return Response.json({
      data: {
        updateDocumentById: {
          document: { ...DOC, ...variables.patch, updatedAt: new Date() },
        },
      },
    });
  };
  return () => {
    globalThis.fetch = realFetch;
  };
};

const pickStatus: Story['play'] = async ({ canvas, userEvent }) => {
  await userEvent.click(
    canvas.getByRole('button', { name: 'Status: Drafting' })
  );
  // The menu portals to <body>, outside the canvas.
  await userEvent.click(
    await within(document.body).findByRole('menuitem', { name: 'Done' })
  );
};

const meta = {
  title: 'Document/DocumentInspector',
  component: DocumentInspector,
  parameters: { layout: 'fullscreen', povs: ['Mara', 'Mara', 'Teo', 'Inès'] },
  decorators: [
    (Story, { parameters }) => {
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
          nodes: (parameters.povs as string[]).map((pov, i) => ({
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

export const Saving: Story = {
  beforeEach: answerSaves('pending'),
  play: pickStatus,
};

export const Saved: Story = {
  beforeEach: answerSaves('success'),
  play: pickStatus,
};

export const SaveFailed: Story = {
  beforeEach: answerSaves('failure'),
  play: pickStatus,
};

const openNotes: Story['play'] = async ({ canvas, userEvent }) => {
  await userEvent.click(canvas.getByRole('tab', { name: 'Notes' }));
};

export const NotesEmpty: Story = {
  play: openNotes,
};

export const NotesWithLongText: Story = {
  args: {
    details: {
      ...DOC,
      notes: Array.from(
        { length: 60 },
        (_, i) =>
          `${i + 1}. Check the tide tables for the night of the crossing.`
      ).join('\n'),
    },
  },
  play: openNotes,
};

export const NotesSaveFailed: Story = {
  beforeEach: answerSaves('failure'),
  play: async (context) => {
    await openNotes(context);
    await context.userEvent.type(
      context.canvas.getByRole('textbox', { name: 'Notes' }),
      'Ask Ines about 1974.'
    );
    await context.canvas.findByText("Couldn't save", {}, { timeout: 2000 });
  },
};

export const PovWithSuggestions: Story = {
  args: { details: { ...DOC, pov: '' } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByLabelText('POV'));
  },
};

export const PovWithNoSuggestions: Story = {
  args: { details: { ...DOC, pov: '' } },
  parameters: { povs: ['', ''] },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByLabelText('POV'));
  },
};
