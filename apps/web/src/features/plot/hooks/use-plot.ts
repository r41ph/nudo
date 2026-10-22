import { useQuery } from '@tanstack/react-query';
import { plotQueryOptions } from '@web/features/plot/api/plot.api';

export function usePlot(projectId: string | undefined) {
  return useQuery(plotQueryOptions(projectId));
}
