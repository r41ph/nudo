import {
  ALargeSmallIcon,
  Heading1,
  AlignLeftIcon,
  BaselineIcon,
  BoldIcon,
  BookOpenIcon,
  CloudIcon,
  CodeIcon,
  FileTextIcon,
  FolderIcon,
  HelpCircleIcon,
  HighlighterIcon,
  ItalicIcon,
  Maximize2Icon,
  Minimize2Icon,
  MessageSquareTextIcon,
  Minus,
  MoonIcon,
  PencilLineIcon,
  PilcrowIcon,
  Plus,
  Quote,
  StrikethroughIcon,
  SunIcon,
  Trash2Icon,
  UnderlineIcon,
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
  bookOpen: BookOpenIcon,
  cloud: CloudIcon,
  fileText: FileTextIcon,
  folder: FolderIcon,
  help: HelpCircleIcon,
  maximize: Maximize2Icon,
  minimize: Minimize2Icon,
  moon: MoonIcon,
  sun: SunIcon,
  trash: Trash2Icon,
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
