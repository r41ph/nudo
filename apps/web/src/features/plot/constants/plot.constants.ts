// The database stores only these keys; the label and colour of each live here,
// so the palette can change without a migration. Order matters: a new plotline
// takes the first key not yet used.
export const PLOTLINE_COLORS = [
  'color1',
  'color2',
  'color3',
  'color4',
  'color5',
  'color6',
  'color7',
  'color8',
] as const;

export const PLOTLINE_COLOR_LABELS = {
  color1: 'Red',
  color2: 'Orange',
  color3: 'Brown',
  color4: 'Green',
  color5: 'Black',
  color6: 'Blue',
  color7: 'Violet',
  color8: 'Pink',
} as const satisfies Record<(typeof PLOTLINE_COLORS)[number], string>;

// Literal class names so Tailwind's scanner sees every one of them.
export const PLOTLINE_COLOR_DOT_CLASS = {
  color1: 'bg-plot-red',
  color2: 'bg-plot-orange',
  color3: 'bg-plot-brown',
  color4: 'bg-plot-green',
  color5: 'bg-plot-black',
  color6: 'bg-plot-blue',
  color7: 'bg-plot-violet',
  color8: 'bg-plot-pink',
} as const satisfies Record<(typeof PLOTLINE_COLORS)[number], string>;

// For inline styles, where a class per colour would need its dark variant too.
export const PLOTLINE_COLOR_VAR = {
  color1: 'var(--plot-red)',
  color2: 'var(--plot-orange)',
  color3: 'var(--plot-brown)',
  color4: 'var(--plot-green)',
  color5: 'var(--plot-black)',
  color6: 'var(--plot-blue)',
  color7: 'var(--plot-violet)',
  color8: 'var(--plot-pink)',
} as const satisfies Record<(typeof PLOTLINE_COLORS)[number], string>;

export const PLOT_LABEL_COLUMN_WIDTH = 180;
export const PLOT_BEAT_COLUMN_WIDTH = 240;

export const PLOT_MINIMAP_WIDTH = 256;
export const PLOT_MINIMAP_MAX_HEIGHT = 120;
export const PLOT_MINIMAP_MIN_FRAME = 12;
export const PLOT_MINIMAP_MARK_MIN_HEIGHT = 2;
export const PLOT_MINIMAP_MARK_MIN_WIDTH = 4;
export const PLOT_MINIMAP_ANNOUNCE_DELAY = 300;

// Below this the board is view-only; the sidebar has already collapsed at
// 1280px, leaving room for the label column and about three beats.
export const PLOT_EDIT_MIN_WIDTH = 1024;
export const PLOT_VIEW_ONLY_MESSAGE =
  'View only — open nudo on a larger screen to edit the plot.';

// Matches the CHECK on plotlines.name and plot_beats.name.
export const PLOT_NAME_MAX_LENGTH = 120;

// Matches the CHECK on plot_cards.title.
export const PLOT_CARD_TITLE_MAX_LENGTH = 200;

export const NEW_PLOTLINE_NAME = 'Untitled plotline';
export const NEW_BEAT_NAME = 'Untitled beat';

export const PLOT_SAVE_ERROR = "Couldn't save your plot. Try again.";
export const PLOT_SAVE_ERROR_ID = 'plot-save-error';

// Cards block the delete (ON DELETE RESTRICT) until the Unassigned choice
// arrives in PR 3.
export const PLOT_DELETE_POPULATED_HINT = 'Move or delete its cards first';

// Enter is left out: on a card it opens the editor.
export const PLOT_DRAG_KEYS = {
  start: ['Space'],
  cancel: ['Escape'],
  end: ['Space'],
};
export const PLOT_DRAG_INSTRUCTIONS =
  'To move it, press Space, use the arrow keys, then press Space to drop ' +
  'it or Escape to cancel.';

export const PLOT_VIEW_STORAGE_PREFIX = 'nudo:plot-view:';
