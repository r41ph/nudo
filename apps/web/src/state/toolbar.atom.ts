import { atom } from 'jotai';

export const enabledToolsAtom = atom<string[]>(['bold', 'italic']);
