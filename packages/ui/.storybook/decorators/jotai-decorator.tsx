import { Provider, createStore } from 'jotai';
import type { Decorator } from '@storybook/react-vite';

/**
 * Storybook decorator that wraps each story in a fresh Jotai Provider.
 * Each story gets its own store so atom state doesn't leak between stories.
 */
export const jotaiDecorator: Decorator = (Story) => {
  const store = createStore();
  return (
    <Provider store={store}>
      <Story />
    </Provider>
  );
};
