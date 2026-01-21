import { Icon, type IconName } from '@ui/components/icon/icon';
import { Label } from '@ui/components/ui/label';
import { Switch } from '@ui/components/ui/switch';

interface Tool {
  name: string;
  label: string;
  enabled: boolean;
}

interface ToolbarToolsListProps {
  tools: Tool[];
  onToggleTool: (toolName: string, enabled: boolean) => void;
}

export function ToolbarToolsList({
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
            id={tool.name}
            name={tool.name}
            value={tool.name}
            defaultChecked={tool.enabled}
            onCheckedChange={(checked) => onToggleTool(tool.name, checked)}
          />
          <Label htmlFor={tool.name}>{tool.label}</Label>
        </div>
      ))}
    </div>
  );
}
