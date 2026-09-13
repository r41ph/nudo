/**
 * The states that reveal an outline row's hover-only chrome: pointer hover,
 * keyboard focus on the row (`group/item` is the tree's focusable wrapper),
 * keyboard focus on one of the row's buttons, or an open menu. Display-based,
 * so at rest the chrome takes no width — the title runs the full row — and
 * neither swallows clicks nor sits in the tab order; focus reaches it through
 * the row. Apply to a flex wrapper, not to a button directly.
 */
export const REVEAL =
  'hidden group-hover/row:flex group-focus-visible/item:flex ' +
  'group-has-[button:focus-visible]/row:flex group-has-[[data-state=open]]/row:flex';
