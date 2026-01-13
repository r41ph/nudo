import { ToolbarButton } from '@ui/components/ui/toolbar';
import { useEditorRef } from 'platejs/react';

type EditorToolbarCustomButtonProps =
  | { icon: React.ElementType; text?: string; tooltip?: string }
  | { icon?: React.ElementType; text: string; tooltip?: string };

export function EditorToolbarCustomButton({
  icon: Icon,
  text,
  tooltip = 'Settings',
}: EditorToolbarCustomButtonProps) {
  const editor = useEditorRef();

  return (
    <ToolbarButton
      tooltip={tooltip}
      onClick={() => {
        // Your custom logic here
        console.log('Custom button clicked', editor);
      }}
    >
      {Icon && <Icon />}
      {text && <span>{text}</span>}
    </ToolbarButton>
  );
}
