import { atom } from 'jotai';
import { type DialogName } from '@web/types/dialog.types';

type DialogState = {
  activeDialog: DialogName | null;
  // data?: unknown;
};

export const dialogAtom = atom<DialogState>({
  activeDialog: null,
});
