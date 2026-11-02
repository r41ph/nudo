import {
  ALargeSmallIcon,
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  Heading1,
  AlignLeftIcon,
  BaselineIcon,
  BoldIcon,
  BookOpenIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronsUpDownIcon,
  CloudIcon,
  CodeIcon,
  FileTextIcon,
  FolderIcon,
  GripVertical,
  HelpCircleIcon,
  HighlighterIcon,
  InfoIcon,
  ItalicIcon,
  KeyboardIcon,
  LogOut,
  Maximize2Icon,
  Minimize2Icon,
  MessageSquareTextIcon,
  Minus,
  MoonIcon,
  MoreHorizontalIcon,
  MoreVerticalIcon,
  PaletteIcon,
  PenIcon,
  PencilIcon,
  CircleDashedIcon,
  PencilLineIcon,
  PanelLeftIcon,
  PanelRightIcon,
  PilcrowIcon,
  Plus,
  Quote,
  SettingsIcon,
  SquareChartGanttIcon,
  StrikethroughIcon,
  SunIcon,
  Trash2Icon,
  UnderlineIcon,
  UsersIcon,
  XIcon,
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
  arrowDown: ArrowDownIcon,
  arrowLeft: ArrowLeftIcon,
  arrowRight: ArrowRightIcon,
  arrowUp: ArrowUpIcon,
  bookOpen: BookOpenIcon,
  check: CheckIcon,
  chevronDown: ChevronDownIcon,
  chevronRight: ChevronRightIcon,
  chevronsUpDown: ChevronsUpDownIcon,
  circleDashed: CircleDashedIcon,
  cloud: CloudIcon,
  fileText: FileTextIcon,
  folder: FolderIcon,
  gripVertical: GripVertical,
  help: HelpCircleIcon,
  info: InfoIcon,
  keyboard: KeyboardIcon,
  logOut: LogOut,
  maximize: Maximize2Icon,
  minimize: Minimize2Icon,
  moon: MoonIcon,
  moreHorizontal: MoreHorizontalIcon,
  moreVertical: MoreVerticalIcon,
  palette: PaletteIcon,
  pen: PenIcon,
  pencil: PencilIcon,
  panelLeft: PanelLeftIcon,
  panelRight: PanelRightIcon,
  settings: SettingsIcon,
  squareChartGantt: SquareChartGanttIcon,
  sun: SunIcon,
  trash: Trash2Icon,
  users: UsersIcon,
  x: XIcon,
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
   * Set beside a text label or inside a labelled control, or the icon's name
   * leaks into the accessible name ("pencil Rename").
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
