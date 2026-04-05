import { atom } from 'jotai';
import { type DialogName } from '@web/shared/state/dialog.types';
import { DIALOG } from '@web/shared/state/dialog.constants';

type DialogState = {
  activeDialog: DialogName | null;
  // data?: unknown;
};

export const dialogAtom = atom<DialogState>({
  activeDialog: null,
});

export const isToolbarDialogOpenAtom = atom(
  (get) => get(dialogAtom).activeDialog === DIALOG.EDITOR_TOOLBAR
);
