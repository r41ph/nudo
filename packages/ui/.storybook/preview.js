import React from 'react';
import './storybook.css';
import { TooltipProvider } from '../src/components/ui/tooltip';
import { jotaiDecorator } from './decorators/jotai-decorator';

/** @type { import('@storybook/react-vite').Preview } */
const preview = {
  decorators: [
    jotaiDecorator,
    (Story) =>
      React.createElement(TooltipProvider, null, React.createElement(Story)),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo',
    },
  },
};

export default preview;
