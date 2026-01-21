import {
  ALargeSmallIcon,
  Heading1,
  AlignLeftIcon,
  BaselineIcon,
  BoldIcon,
  CodeIcon,
  HighlighterIcon,
  ItalicIcon,
  MessageSquareTextIcon,
  PencilLineIcon,
  PilcrowIcon,
  Quote,
  StrikethroughIcon,
  UnderlineIcon,
  Minus,
  Plus,
} from 'lucide-react';

const icons = {
  fontSize: ALargeSmallIcon,
  paragraph: PilcrowIcon,
  bold: BoldIcon,
  italic: ItalicIcon,
  underline: UnderlineIcon,
  strikethrough: StrikethroughIcon,
  blockquote: Quote,
  codeBlock: CodeIcon,
  highlightColor: HighlighterIcon,
  textAlignment: AlignLeftIcon,
  headings: Heading1,
  fontColor: BaselineIcon,
  comments: MessageSquareTextIcon,
  suggestions: PencilLineIcon,
  minus: Minus,
  plus: Plus,
} as const;

export type IconName = keyof typeof icons;

export function Icon({
  name,
  className,
}: {
  name: IconName;
  className?: string;
}) {
  const IconComponent = icons[name];
  return IconComponent ? (
    <IconComponent className={className} aria-label={name} />
  ) : null;
}
