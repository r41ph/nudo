// Display-based rather than opacity so hidden chrome takes no width, swallows
// no clicks and isn't in the tab order; focus reaches it through the row
// (`group/item` is headless-tree's focusable wrapper). Apply to a flex wrapper.
export const REVEAL =
  'hidden group-hover/row:flex group-focus-visible/item:flex ' +
  'group-has-[button:focus-visible]/row:flex group-has-[[data-state=open]]/row:flex';
