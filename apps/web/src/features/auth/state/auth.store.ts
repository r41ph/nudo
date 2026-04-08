import { atom } from 'jotai';
import type { AuthUser } from '@web/shared/lib/auth';
import { getToken, getStoredUser } from '@web/shared/lib/auth';

export const tokenAtom = atom<string | null>(getToken());
export const userAtom = atom<AuthUser | null>(getStoredUser());
export const isAuthenticatedAtom = atom((get) => get(tokenAtom) !== null);
export const userIdAtom = atom((get) => get(userAtom)?.id ?? null);
