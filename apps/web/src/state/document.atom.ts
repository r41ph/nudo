import { atom } from 'jotai';

export interface DocumentData {
  id: string;
  title: string;
  slug: string;
  content: unknown[];
  wordCount: number;
  settingsId: string | null;
}

export const currentDocumentAtom = atom<DocumentData | null>(null);
