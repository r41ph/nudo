import { useId } from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { Button } from '@ui/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@ui/components/ui/dropdown-menu';
import { cn } from '@ui/lib/utils';
import { PLOTLINE_COLOR_DOT_CLASS } from '@web/features/plot/constants/plot.constants';
import type {
  PlotBeat,
  Plotline,
  PlotlineColor,
} from '@web/features/plot/plot.types';

export interface CardPlacement {
  plotlineId: string;
  beatId: string;
}

interface CardLocationProps {
  plotlines: readonly Plotline[];
  beats: readonly PlotBeat[];
  value: CardPlacement;
  onChange: (value: CardPlacement) => void;
  editable: boolean;
}

export function CardLocation({
  plotlines,
  beats,
  value,
  onChange,
  editable,
}: CardLocationProps) {
  const headingId = useId();

  return (
    <div role="group" aria-labelledby={headingId} className="grid gap-2">
      <span id={headingId} className="text-sm leading-none font-medium">
        Location
      </span>
      <div className="grid grid-cols-2 gap-3">
        <LocationPicker
          label="Plotline"
          options={plotlines.map((p) => ({
            id: p.id,
            name: p.name,
            color: p.color,
          }))}
          value={value.plotlineId}
          onChange={(plotlineId) => onChange({ ...value, plotlineId })}
          disabled={!editable}
        />
        <LocationPicker
          label="Beat"
          options={beats.map((b) => ({ id: b.id, name: b.name }))}
          value={value.beatId}
          onChange={(beatId) => onChange({ ...value, beatId })}
          disabled={!editable}
        />
      </div>
    </div>
  );
}

interface LocationOption {
  id: string;
  name: string;
  color?: PlotlineColor;
}

function ColorDot({ color }: { color?: PlotlineColor }) {
  if (!color) return null;
  return (
    <span
      aria-hidden
      className={cn(
        'size-2.5 shrink-0 rounded-full',
        PLOTLINE_COLOR_DOT_CLASS[color]
      )}
    />
  );
}

function LocationPicker({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: LocationOption[];
  value: string;
  onChange: (id: string) => void;
  disabled: boolean;
}) {
  const current = options.find((o) => o.id === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button
          type="button"
          variant="outline"
          aria-label={`${label}: ${current?.name ?? ''}`}
          className="w-full min-w-0 justify-between font-normal"
        >
          <span className="flex min-w-0 items-center gap-2">
            <ColorDot color={current?.color} />
            <span className="truncate">{current?.name}</span>
          </span>
          <ChevronDownIcon aria-hidden className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-(--radix-dropdown-menu-trigger-width)"
      >
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.id} value={option.id}>
              <ColorDot color={option.color} />
              <span className="truncate">{option.name}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
