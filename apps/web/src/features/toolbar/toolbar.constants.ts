export const FONT_SIZE_TOOL_KEY = 'fontSize';

export const TOOLBAR_TOOLS = {
  [FONT_SIZE_TOOL_KEY]: 'Font Size',
  paragraph: 'Paragraph',
  bold: 'Bold',
  italic: 'Italic',
  underline: 'Underline',
  strikethrough: 'Strike through',
  blockquote: 'Blockquote',
  // Keyed `codeBlock` for backwards-compat with persisted toolbar settings, but
  // the button applies an inline code mark (there is no code-block plugin).
  codeBlock: 'Inline Code',
  highlightColor: 'Highlight Color',
  headings: 'Headings',
  textAlignment: 'Text Alignment',
  fontColor: 'Font Color',
  comments: 'Comments',
  suggestions: 'Suggestions',
} as const;
