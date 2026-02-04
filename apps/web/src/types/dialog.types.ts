import { DIALOG } from '../constants/dialog.constants';
export type DialogName = (typeof DIALOG)[keyof typeof DIALOG];
