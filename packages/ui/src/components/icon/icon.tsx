import {
  ALargeSmallIcon,
  Heading1,
  AlignLeftIcon,
  BaselineIcon,
  BoldIcon,
  BookOpenIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CloudIcon,
  CodeIcon,
  FileTextIcon,
  FolderIcon,
  GripVertical,
  HelpCircleIcon,
  HighlighterIcon,
  ItalicIcon,
  LogOut,
  Maximize2Icon,
  Minimize2Icon,
  MessageSquareTextIcon,
  Minus,
  MoonIcon,
  MoreHorizontalIcon,
  PenIcon,
  PencilIcon,
  CircleDashedIcon,
  PencilLineIcon,
  PilcrowIcon,
  Plus,
  Quote,
  SettingsIcon,
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
  check: CheckIcon,
  chevronDown: ChevronDownIcon,
  chevronRight: ChevronRightIcon,
  circleDashed: CircleDashedIcon,
  cloud: CloudIcon,
  fileText: FileTextIcon,
  folder: FolderIcon,
  gripVertical: GripVertical,
  help: HelpCircleIcon,
  logOut: LogOut,
  maximize: Maximize2Icon,
  minimize: Minimize2Icon,
  moon: MoonIcon,
  moreHorizontal: MoreHorizontalIcon,
  pen: PenIcon,
  pencil: PencilIcon,
  settings: SettingsIcon,
  sun: SunIcon,
  trash: Trash2Icon,
} as const;

export type IconName = keyof typeof icons;

export function Icon({
  name,
  className,
  decorative = false,
}: {
  name: IconName;
  className?: string;
  /**
   * Hide the glyph from assistive tech. Use whenever the icon sits beside a
   * text label or inside an already-labelled control — otherwise the icon's
   * own name leaks into the accessible name ("pencil Rename").
   */
  decorative?: boolean;
}) {
  const IconComponent = icons[name];
  if (!IconComponent) return null;
  return decorative ? (
    <IconComponent className={className} aria-hidden focusable="false" />
  ) : (
    <IconComponent className={className} aria-label={name} />
  );
}
