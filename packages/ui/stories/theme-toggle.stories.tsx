import type { Meta, StoryObj } from '@storybook/react-vite';
import { Provider, createStore } from 'jotai';
import { ThemeToggle } from '@web/shared/components/theme-toggle';
import { themeAtom } from '@web/shared/state/theme.atom';

const meta = {
  title: 'Components/ThemeToggle',
  component: ThemeToggle,
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Light: Story = {
  decorators: [
    (Story) => {
      const store = createStore();
      store.set(themeAtom, 'light');
      return (
        <Provider store={store}>
          <Story />
        </Provider>
      );
    },
  ],
};

export const Dark: Story = {
  decorators: [
    (Story) => {
      const store = createStore();
      store.set(themeAtom, 'dark');
      return (
        <div className="dark bg-background p-4 rounded">
          <Provider store={store}>
            <Story />
          </Provider>
        </div>
      );
    },
  ],
};
