import { Icon, type IconName } from '@ui/components/icon/icon';
import {
  TOOLBAR_TOOLS,
  FONT_SIZE_TOOL_KEY,
} from '@web/features/toolbar/toolbar.constants';

interface ToolbarPreviewProps {
  enabledTools: string[];
}

export function ToolbarPreview({ enabledTools }: ToolbarPreviewProps) {
  return (
    <div className="toolbar-preview flex justify-start gap-4 my-4 p-2 border border-border rounded-md shrink-0 shadow-md">
      {Object.keys(TOOLBAR_TOOLS)
        .filter((toolName) => enabledTools.includes(toolName))
        .map((toolName) => {
          return toolName !== FONT_SIZE_TOOL_KEY ? (
            <Icon
              key={toolName}
              name={toolName as IconName}
              className="my-auto"
            />
          ) : (
            <div
              className="flex h-7 items-center gap-1 rounded-md bg-muted/60 p-0"
              key={toolName}
            >
              <Icon name="minus" className="my-auto mr-1" />
              <span className="mx-1">16</span>
              <Icon name="plus" className="my-auto ml-1" />
            </div>
          );
        })}
    </div>
  );
}
