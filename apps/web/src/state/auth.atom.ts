import { atom } from 'jotai';
import type { AuthUser } from '@web/lib/auth';
import { getToken, getStoredUser } from '@web/lib/auth';

export const tokenAtom = atom<string | null>(getToken());
export const userAtom = atom<AuthUser | null>(getStoredUser());
export const isAuthenticatedAtom = atom((get) => get(tokenAtom) !== null);
