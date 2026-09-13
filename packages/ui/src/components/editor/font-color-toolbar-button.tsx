'use client';
/* eslint-disable react-hooks/refs -- Ref usage for color picker component refs */

import React from 'react';

import type { DropdownMenuProps } from '@radix-ui/react-dropdown-menu';

import { EraserIcon } from 'lucide-react';
import { useEditorRef, useEditorSelector } from 'platejs/react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ui/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@ui/components/ui/tooltip';
import { cn } from '@ui/lib/utils';

import { ToolbarButton, ToolbarMenuGroup } from '@ui/components/ui/toolbar';

export function FontColorToolbarButton({
  children,
  nodeType,
  tooltip,
}: {
  nodeType: string;
  tooltip?: string;
} & DropdownMenuProps) {
  const editor = useEditorRef();

  const selectionDefined = useEditorSelector(
    (editor) => !!editor.selection,
    []
  );

  const color = useEditorSelector(
    (editor) => editor.api.mark(nodeType) as string,
    [nodeType]
  );

  const [selectedColor, setSelectedColor] = React.useState<string>();
  const [open, setOpen] = React.useState(false);
  // The dropdown takes focus, so the selection is captured on open to apply the colour to.
  const savedSelectionRef = React.useRef(editor.selection);

  const onToggle = React.useCallback(
    (value = !open) => {
      setOpen(value);
    },
    [open, setOpen]
  );

  const updateColor = React.useCallback(
    (value: string) => {
      const selection = savedSelectionRef.current;
      if (selection) {
        setSelectedColor(value);

        editor.tf.select(selection);
        editor.tf.focus();

        editor.tf.addMarks({ [nodeType]: value });
      }
    },
    [editor, nodeType]
  );

  const updateColorAndClose = React.useCallback(
    (value: string) => {
      updateColor(value);
      onToggle();
    },
    [onToggle, updateColor]
  );

  const clearColor = React.useCallback(() => {
    const selection = savedSelectionRef.current;
    if (selection) {
      editor.tf.select(selection);
      editor.tf.focus();

      if (selectedColor) {
        editor.tf.removeMarks(nodeType);
      }

      onToggle();
    }
  }, [editor, selectedColor, onToggle, nodeType]);

  React.useEffect(() => {
    if (selectionDefined) {
      setSelectedColor(color);
    }
  }, [color, selectionDefined]);

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(value) => {
        if (value) {
          savedSelectionRef.current = editor.selection;
        }
        setOpen(value);
      }}
      modal={false}
    >
      <DropdownMenuTrigger asChild>
        <ToolbarButton pressed={open} tooltip={tooltip}>
          {children}
        </ToolbarButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="ignore-click-outside/toolbar"
      >
        <ColorPicker
          color={selectedColor || color}
          clearColor={clearColor}
          colors={DEFAULT_COLORS}
          updateColor={updateColorAndClose}
          updateCustomColor={updateColor}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PureColorPicker({
  className,
  clearColor,
  color,
  colors,
  updateColor,
  ...props
}: React.ComponentProps<'div'> & {
  colors: TColor[];
  clearColor: () => void;
  updateColor: (color: string) => void;
  updateCustomColor: (color: string) => void;
  color?: string;
}) {
  return (
    <div className={cn('flex flex-col', className)} {...props}>
      {/* <ToolbarMenuGroup label="Custom Colors">
        <ColorCustom
          color={color}
          className="px-2"
          colors={colors}
          customColors={customColors}
          updateColor={updateColor}
          updateCustomColor={updateCustomColor}
        />
      </ToolbarMenuGroup> */}
      <ToolbarMenuGroup>
        <ColorDropdownMenuItems
          color={color}
          className="px-2"
          colors={colors}
          updateColor={updateColor}
        />
      </ToolbarMenuGroup>
      {color && (
        <ToolbarMenuGroup>
          <DropdownMenuItem className="p-2" onClick={clearColor}>
            <EraserIcon />
            <span>Clear</span>
          </DropdownMenuItem>
        </ToolbarMenuGroup>
      )}
    </div>
  );
}

const ColorPicker = React.memo(PureColorPicker);

type TColor = {
  isBrightColor: boolean;
  name: string;
  value: string;
};

const ColorDropdownMenuItem = React.memo(function ColorDropdownMenuItem({
  className,
  isBrightColor,
  isSelected,
  name,
  onSelect,
  value,
}: {
  className?: string;
  isBrightColor: boolean;
  isSelected: boolean;
  value: string;
  onSelect: (value: string) => void;
  name?: string;
}) {
  const content = (
    <button
      type="button"
      role="menuitem"
      className={cn(
        'my-1 flex size-6 cursor-pointer items-center justify-center rounded-full border border-solid p-0 transition-transform hover:scale-125',
        isBrightColor ? 'border-muted' : 'border-transparent',
        isSelected && 'ring-2 ring-primary ring-offset-1',
        className
      )}
      style={{ backgroundColor: value }}
      onClick={() => onSelect(value)}
    />
  );

  return name ? (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent className="capitalize">{name}</TooltipContent>
    </Tooltip>
  ) : (
    content
  );
});

export function ColorDropdownMenuItems({
  className,
  color,
  colors,
  updateColor,
  ...props
}: {
  colors: TColor[];
  updateColor: (color: string) => void;
  color?: string;
} & React.ComponentProps<'div'>) {
  // Read through a ref so `handleSelect` stays stable for the memoised children.
  const updateColorRef = React.useRef(updateColor);
  updateColorRef.current = updateColor;

  const handleSelect = React.useCallback((value: string) => {
    updateColorRef.current(value);
  }, []);

  return (
    <TooltipProvider skipDelayDuration={0}>
      <div
        className={cn(
          'grid grid-cols-[repeat(10,1fr)] place-items-center gap-x-1',
          className
        )}
        {...props}
      >
        {colors.map(({ isBrightColor, name, value }) => (
          <ColorDropdownMenuItem
            name={name}
            key={name ?? value}
            value={value}
            isBrightColor={isBrightColor}
            isSelected={color === value}
            onSelect={handleSelect}
          />
        ))}
        {props.children}
      </div>
    </TooltipProvider>
  );
}

export const DEFAULT_COLORS = [
  {
    isBrightColor: false,
    name: 'black',
    value: '#000000',
  },
  {
    isBrightColor: false,
    name: 'dark gray',
    value: '#333333',
  },
  {
    isBrightColor: false,
    name: 'light gray',
    value: '#888888',
  },
  {
    isBrightColor: false,
    name: 'red',
    value: '#D32F2F',
  },
  {
    isBrightColor: false,
    name: 'orange',
    value: '#F57C00',
  },
  {
    isBrightColor: true,
    name: 'yellow',
    value: '#FBC02D',
  },
  {
    isBrightColor: false,
    name: 'green',
    value: '#388E3C',
  },
  {
    isBrightColor: false,
    name: 'blue',
    value: '#1976D2',
  },
  {
    isBrightColor: false,
    name: 'purple',
    value: '#7B1FA2',
  },
];
