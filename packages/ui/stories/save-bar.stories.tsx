import type { Meta, StoryObj } from '@storybook/react-vite';
import { Provider as JotaiProvider, createStore } from 'jotai';
import { SaveBar } from '@web/shared/components/save-bar';
import {
  saveStatusAtom,
  lastSavedAtom,
  type SaveStatus,
} from '@web/shared/state/save-status.atom';

function storeFor(status: SaveStatus, lastSaved: Date | null = null) {
  const store = createStore();
  store.set(saveStatusAtom, status);
  store.set(lastSavedAtom, lastSaved);
  return store;
}

const meta = {
  title: 'Shared/SaveBar',
  component: SaveBar,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof SaveBar>;

export default meta;
type Story = StoryObj<typeof meta>;

function withStatus(status: SaveStatus, lastSaved: Date | null = null): Story {
  return {
    decorators: [
      (Story) => (
        <JotaiProvider store={storeFor(status, lastSaved)}>
          <Story />
        </JotaiProvider>
      ),
    ],
  };
}

export const Unsaved: Story = withStatus('unsaved');
export const Saving: Story = withStatus('saving');
export const Saved: Story = withStatus('saved');
export const Failed: Story = withStatus('error');
export const WithTimestamp: Story = withStatus('saved', new Date());
export const NoTimestamp: Story = {
  ...withStatus('saved', new Date()),
  args: { showTimestamp: false },
};
