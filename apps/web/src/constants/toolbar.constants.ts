export const FONT_SIZE_TOOL_KEY = 'fontSize';

export const TOOLBAR_TOOLS = {
  [FONT_SIZE_TOOL_KEY]: 'Font Size',
  paragraph: 'Paragraph',
  bold: 'Bold',
  italic: 'Italic',
  underline: 'Underline',
  strikethrough: 'Strike through',
  blockquote: 'Blockquote',
  codeBlock: 'Code Block',
  highlightColor: 'Highlight Color',
  headings: 'Headings',
  textAlignment: 'Text Alignment',
  fontColor: 'Font Color',
  comments: 'Comments',
  suggestions: 'Suggestions',
} as const;

export type ToolbarToolName = keyof typeof TOOLBAR_TOOLS;
