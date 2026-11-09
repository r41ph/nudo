import { atom } from 'jotai';

export type InspectorTab = 'details' | 'notes';

export interface InspectorState {
  isOpen: boolean;
  collapsed: boolean;
  tab: InspectorTab;
}

const CLOSED: InspectorState = {
  isOpen: false,
  collapsed: false,
  tab: 'details',
};

// Shared because the outline (sidebar feature) opens the panel and the
// document feature renders it.
//
// Below the collapse breakpoint only one panel fits, so expanding either one
// collapses the other. That rule is enforced here rather than in usePanels
// because it is safe at every width — above the breakpoint `collapsed` and
// `outlineOpen` are both ignored — and because the outline's own Details action
// writes these atoms directly and would otherwise bypass it.
export const inspectorAtom = atom<InspectorState>(CLOSED);

// Only consulted below the collapse breakpoint; above it the outline is always
// shown, so the default describes the narrow layout.
export const outlineOpenAtom = atom(false);

// One-shot: raised by an explicit open, consumed by the panel once it has moved
// focus. The panel remounts on every document switch, so focusing on mount
// would also steal focus from the outline when the writer just picked another
// document.
export const inspectorFocusRequestedAtom = atom(false);

export const consumeInspectorFocusAtom = atom(null, (_get, set) => {
  set(inspectorFocusRequestedAtom, false);
});

export const openInspectorAtom = atom(null, (_get, set) => {
  set(inspectorAtom, { isOpen: true, collapsed: false, tab: 'details' });
  set(outlineOpenAtom, false);
  set(inspectorFocusRequestedAtom, true);
});

export const closeInspectorAtom = atom(null, (_get, set) => {
  set(inspectorAtom, CLOSED);
  set(inspectorFocusRequestedAtom, false);
});

// A closed panel has nothing to collapse; refusing here keeps
// { isOpen: false, collapsed: true } unrepresentable.
export const setInspectorCollapsedAtom = atom(
  null,
  (get, set, collapsed: boolean) => {
    const state = get(inspectorAtom);
    if (!state.isOpen) return;
    set(inspectorAtom, { ...state, collapsed });
    if (!collapsed) set(outlineOpenAtom, false);
  }
);

export const setInspectorTabAtom = atom(null, (get, set, tab: InspectorTab) => {
  const state = get(inspectorAtom);
  if (!state.isOpen) return;
  set(inspectorAtom, { ...state, tab });
});

export const setOutlineOpenAtom = atom(null, (get, set, open: boolean) => {
  set(outlineOpenAtom, open);
  const inspector = get(inspectorAtom);
  if (open && inspector.isOpen) {
    set(inspectorAtom, { ...inspector, collapsed: true });
  }
});
