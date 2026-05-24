import { atom } from 'jotai';
import type {
  DocumentData,
  LiveWordCount,
} from '@web/features/document/document.types';

export const currentDocumentAtom = atom<DocumentData | null>(null);
export const liveWordCountAtom = atom<LiveWordCount | null>(null);
