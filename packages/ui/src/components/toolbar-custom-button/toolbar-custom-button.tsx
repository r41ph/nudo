import { ToolbarButton } from '@ui/components/ui/toolbar';

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
  return (
    <ToolbarButton tooltip={tooltip} onClick={onClick}>
      {Icon && <Icon />}
      {text && <span>{text}</span>}
    </ToolbarButton>
  );
}
