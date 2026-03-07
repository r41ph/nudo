import { fn } from 'storybook/test';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { MainEditor } from '@ui/components/main-editor/main-editor';

const ALL_TOOLS = [
  'fontSize',
  'paragraph',
  'bold',
  'italic',
  'underline',
  'strikethrough',
  'blockquote',
  'codeBlock',
  'highlightColor',
  'headings',
  'textAlignment',
  'fontColor',
  'comments',
  'suggestions',
];

const meta: Meta<typeof MainEditor> = {
  title: 'MainEditor',
  component: MainEditor,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  args: {
    handleEditToolbarDialog: fn(),
    onContentChange: fn(),
    enabledTools: ['bold', 'italic'],
    isDialogOpen: false,
  },
  argTypes: {
    enabledTools: {
      control: 'check',
      options: ALL_TOOLS,
    },
    isDialogOpen: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof MainEditor>;

export const Default: Story = {};

export const AllTools: Story = {
  args: {
    enabledTools: ALL_TOOLS,
  },
};

