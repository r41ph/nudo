// Between the sidebar (295px) and the mockup's ~350px.
export const INSPECTOR_WIDTH = '336px';

// The details form marks the field that should take focus when the panel is
// opened; without one, focus lands on the active tab.
export const INSPECTOR_AUTOFOCUS_ATTR = 'data-inspector-autofocus';

export const EDITOR_SELECTOR = '[data-slate-editor]';

// Shorter than the editor's 2500ms autosave: these fields are small, and a
// writer often tabs away from them straight after typing.
export const DETAILS_DEBOUNCE_MS = 1000;

// Mirrors the CHECK constraint on documents.pov (migration 023).
export const POV_MAX = 120;

// Past this the browser's suggestion popup is slower to scan than typing.
export const POV_SUGGESTION_LIMIT = 50;
