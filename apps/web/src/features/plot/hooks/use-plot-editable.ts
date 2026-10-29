import { PLOT_EDIT_MIN_WIDTH } from '@web/features/plot/constants/plot.constants';
import { useMediaQuery } from '@web/shared/hooks/use-media-query';

export function usePlotEditable(): boolean {
  return useMediaQuery(`(min-width: ${PLOT_EDIT_MIN_WIDTH}px)`);
}
