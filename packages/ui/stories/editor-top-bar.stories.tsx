import type { Meta, StoryObj, Decorator } from '@storybook/react-vite';
import { Provider, createStore } from 'jotai';
import { EditorTopBar } from '@web/features/document/components/editor-top-bar';
import { isFocusModeAtom } from '@web/shared/state/focus-mode.atom';
import { saveStatusAtom } from '@web/shared/state/save-status.atom';

function withStore(
  focus: boolean,
  saveStatus: 'idle' | 'saving' | 'error'
): Decorator {
  return function WithStore(Story) {
    const store = createStore();
    store.set(isFocusModeAtom, focus);
    store.set(saveStatusAtom, saveStatus);
    return (
      <Provider store={store}>
        <Story />
      </Provider>
    );
  };
}

const meta = {
  title: 'Editor/EditorTopBar',
  component: EditorTopBar,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof EditorTopBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { decorators: [withStore(false, 'idle')] };

export const FocusMode: Story = { decorators: [withStore(true, 'idle')] };

export const Saving: Story = { decorators: [withStore(false, 'saving')] };

export const SaveFailed: Story = { decorators: [withStore(false, 'error')] };
