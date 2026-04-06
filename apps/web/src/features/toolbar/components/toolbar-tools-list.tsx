import { memo } from 'react';
import { Icon, type IconName } from '@ui/components/icon/icon';
import { Label } from '@ui/components/ui/label';
import { Switch } from '@ui/components/ui/switch';
import type { ToolbarToolName } from '@web/features/toolbar/toolbar.types';

interface Tool {
  name: ToolbarToolName;
  label: string;
  enabled: boolean;
}

interface ToolbarToolsListProps {
  tools: Tool[];
  onToggleTool: (toolName: ToolbarToolName, enabled: boolean) => void;
}

export const ToolbarToolsList = memo(function ToolbarToolsList({
  tools,
  onToggleTool,
}: ToolbarToolsListProps) {
  return (
    <div className="grid-cols-2 grid gap-4 overflow-y-auto min-h-0">
      {tools.map((tool) => (
        <div
          key={tool.name}
          className="flex justify-self-stretch gap-3 items-center"
        >
          <Icon name={tool.name as IconName} className="my-auto" />
          <Switch
            className="hover:cursor-pointer"
            id={tool.name}
            name={tool.name}
            value={tool.name}
            defaultChecked={tool.enabled}
            onCheckedChange={(checked) => onToggleTool(tool.name, checked)}
          />
          <Label htmlFor={tool.name} className="hover:cursor-pointer">
            {tool.label}
          </Label>
        </div>
      ))}
    </div>
  );
});
