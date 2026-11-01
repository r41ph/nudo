import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { Provider, createStore } from 'jotai';
import { FocusModeButton } from '@web/shared/components/focus-mode-button';
import { isFocusModeAtom } from '@web/shared/state/focus-mode.atom';

function withFocusMode(focus: boolean): Decorator {
  return function WithFocusMode(Story) {
    const store = createStore();
    store.set(isFocusModeAtom, focus);
    return (
      <Provider store={store}>
        <Story />
      </Provider>
    );
  };
}

const meta = {
  title: 'Shared/FocusModeButton',
  component: FocusModeButton,
} satisfies Meta<typeof FocusModeButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { decorators: [withFocusMode(false)] };

export const InFocusMode: Story = { decorators: [withFocusMode(true)] };
