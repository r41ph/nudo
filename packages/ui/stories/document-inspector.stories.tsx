import type { Meta, StoryObj } from '@storybook/react-vite';
import { Provider, createStore } from 'jotai';
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
  summary: '',
  pov: '',
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
      return (
        <Provider store={store}>
          <div className="h-[560px] w-[336px] border-l border-border bg-background">
            <Story />
          </div>
        </Provider>
      );
    },
  ],
  args: { details: DOC },
} satisfies Meta<typeof DocumentInspector>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Document: Story = {};

export const Folder: Story = {
  args: { details: { ...DOC, kind: 'folder', title: 'Chapter One' } },
};

export const Separator: Story = {
  args: { details: { ...DOC, kind: 'separator', title: 'Part One' } },
};
