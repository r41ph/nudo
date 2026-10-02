import type { Meta, StoryObj, Decorator } from '@storybook/react-vite';
import { Provider, createStore } from 'jotai';
import { EditorTopBar } from '@web/features/document/components/editor-top-bar';
import { isFocusModeAtom } from '@web/shared/state/focus-mode.atom';
import {
  openInspectorAtom,
  setOutlineOpenAtom,
} from '@web/shared/state/panels.atom';
import { saveStatusAtom } from '@web/shared/state/save-status.atom';

function withStore(
  focus: boolean,
  saveStatus: 'idle' | 'saving' | 'error',
  panels: { inspectorOpen?: boolean; outlineOpen?: boolean } = {}
): Decorator {
  return function WithStore(Story) {
    const store = createStore();
    store.set(isFocusModeAtom, focus);
    store.set(saveStatusAtom, saveStatus);
    if (panels.inspectorOpen) store.set(openInspectorAtom);
    if (panels.outlineOpen) store.set(setOutlineOpenAtom, true);
    return (
      <Provider store={store}>
        <Story />
      </Provider>
    );
  };
}

// The panel toggles only exist below 1280px.
const narrow = { viewport: { value: 'tablet', isRotated: false } };

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

export const NarrowOutlineCollapsed: Story = {
  globals: narrow,
  decorators: [withStore(false, 'idle')],
};

export const NarrowOutlineOpen: Story = {
  globals: narrow,
  decorators: [withStore(false, 'idle', { outlineOpen: true })],
};

export const NarrowDetailsOpen: Story = {
  globals: narrow,
  decorators: [withStore(false, 'idle', { inspectorOpen: true })],
};

export const NarrowDetailsCollapsed: Story = {
  globals: narrow,
  decorators: [
    withStore(false, 'idle', { inspectorOpen: true, outlineOpen: true }),
  ],
};
