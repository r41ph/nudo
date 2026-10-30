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

// Both ids are null when the card is Unassigned; never just one.
export interface PlotCell {
  plotlineId: string | null;
  beatId: string | null;
}

export interface PlotCard extends PlotCell {
  id: string;
  title: string;
  description: string;
  position: number;
}

export interface Plot {
  plotlines: Plotline[];
  beats: PlotBeat[];
  cards: PlotCard[];
}
