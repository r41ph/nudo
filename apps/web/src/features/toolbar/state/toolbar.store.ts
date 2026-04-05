import { atom } from 'jotai';
import type { ToolbarToolName } from '@web/features/toolbar/types';

export const enabledToolsAtom = atom<ToolbarToolName[]>(['bold', 'italic']);
