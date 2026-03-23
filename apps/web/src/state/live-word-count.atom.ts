import { atom } from 'jotai';

export interface LiveWordCount {
  documentId: string;
  count: number;
}

export const liveWordCountAtom = atom<LiveWordCount | null>(null);
