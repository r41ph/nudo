// Order matters: a new plotline takes the first key not yet used.
export const PLOTLINE_COLORS = [
  'blue',
  'green',
  'plum',
  'ochre',
  'teal',
  'rose',
  'slate',
] as const;

export const PLOTLINE_COLOR_LABELS = {
  blue: 'Blue',
  green: 'Green',
  plum: 'Plum',
  ochre: 'Ochre',
  teal: 'Teal',
  rose: 'Rose',
  slate: 'Slate',
} as const satisfies Record<(typeof PLOTLINE_COLORS)[number], string>;

// Literal class names so Tailwind's scanner sees every one of them.
export const PLOTLINE_COLOR_DOT_CLASS = {
  blue: 'bg-plot-blue',
  green: 'bg-plot-green',
  plum: 'bg-plot-plum',
  ochre: 'bg-plot-ochre',
  teal: 'bg-plot-teal',
  rose: 'bg-plot-rose',
  slate: 'bg-plot-slate',
} as const satisfies Record<(typeof PLOTLINE_COLORS)[number], string>;

export const PLOT_LABEL_COLUMN_WIDTH = 200;
export const PLOT_BEAT_COLUMN_WIDTH = 240;

// Below this the board is view-only; the sidebar has already collapsed at
// 1280px, leaving room for the label column and about three beats.
export const PLOT_EDIT_MIN_WIDTH = 1024;

// Matches the CHECK on plotlines.name and plot_beats.name.
export const PLOT_NAME_MAX_LENGTH = 120;

export const NEW_PLOTLINE_NAME = 'Untitled plotline';
export const NEW_BEAT_NAME = 'Untitled beat';

export const PLOT_SAVE_ERROR = "Couldn't save your plot. Try again.";
export const PLOT_SAVE_ERROR_ID = 'plot-save-error';
