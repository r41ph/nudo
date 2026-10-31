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

export interface PlotView {
  hiddenPlotlineIds: readonly string[];
  hiddenBeatIds: readonly string[];
}

// Asks the board to focus a card, or a cell's Add card, once it has rendered:
// after a move or delete the element that opened the editor is gone. The
// nonce makes a repeat request for the same target fire again.
export type PlotFocusRequest = { nonce: number } & (
  | { cardId: string }
  | { cellKey: string }
);
