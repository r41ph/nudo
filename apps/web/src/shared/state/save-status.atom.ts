import { atom } from 'jotai';

export type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error';

export const saveStatusAtom = atom<SaveStatus>('idle');
export const lastSavedAtom = atom<Date | null>(null);
