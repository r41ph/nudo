import { DIALOG_NAMES } from '../constants/dialog.constants';
export type DialogName = (typeof DIALOG_NAMES)[keyof typeof DIALOG_NAMES];
