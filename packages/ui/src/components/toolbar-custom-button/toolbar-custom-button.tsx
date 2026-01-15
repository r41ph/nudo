import { ToolbarButton } from '@ui/components/ui/toolbar';
import { useEditorRef } from 'platejs/react';

type ToolbarCustomButtonProps =
  | {
      icon: React.ElementType;
      text?: string;
      tooltip?: string;
      onClick?: () => void;
    }
  | {
      icon?: React.ElementType;
      text: string;
      tooltip?: string;
      onClick?: () => void;
    };

export function ToolbarCustomButton({
  icon: Icon,
  text,
  tooltip = 'Settings',
  onClick,
}: ToolbarCustomButtonProps) {
  const editor = useEditorRef();

  return (
    <ToolbarButton
      tooltip={tooltip}
      onClick={() => {
        // Your custom logic here
        console.log('Custom button clicked', editor);
        if (onClick) {
          onClick();
        }
      }}
    >
      {Icon && <Icon />}
      {text && <span>{text}</span>}
    </ToolbarButton>
  );
}
