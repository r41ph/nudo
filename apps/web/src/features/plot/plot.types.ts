import type { PLOTLINE_COLORS } from '@web/features/plot/constants/plot.constants';

export type PlotlineColor = (typeof PLOTLINE_COLORS)[number];

export interface Plotline {
  id: string;
  name: string;
  color: PlotlineColor;
  position: number;
}

export interface PlotBeat {
  id: string;
  name: string;
  position: number;
}

export interface Plot {
  plotlines: Plotline[];
  beats: PlotBeat[];
}
