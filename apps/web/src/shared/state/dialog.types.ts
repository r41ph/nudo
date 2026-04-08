import { DIALOG } from '@web/shared/state/dialog.constants';
export type DialogName = (typeof DIALOG)[keyof typeof DIALOG];
