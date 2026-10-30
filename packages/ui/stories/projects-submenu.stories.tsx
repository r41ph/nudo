import type { Meta, StoryObj } from '@storybook/react-vite';
import { within } from 'storybook/test';
import { Button } from '@ui/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@ui/components/ui/dropdown-menu';
import { ProjectsSubmenuView } from '@web/features/project/components/projects-submenu';
import { ACCOUNT_MENU_ITEM } from '@web/features/sidebar/sidebar.constants';

const LAMP = { id: 'p1', title: 'The Lamp' };
const SALT = { id: 'p2', title: 'Salt Year' };
const MOTH = { id: 'p3', title: 'A Very Long Working Title for the Moth Book' };

const openSubmenu: Story['play'] = async ({ canvas, userEvent }) => {
  await userEvent.click(canvas.getByRole('button', { name: 'Account' }));
  // The menu portals to <body>, outside the canvas.
  const trigger = await within(document.body).findByRole('menuitem', {
    name: 'Projects',
  });
  trigger.focus();
  await userEvent.keyboard('{ArrowRight}');
};

const meta = {
  title: 'Project/ProjectsSubmenu',
  component: ProjectsSubmenuView,
  parameters: { layout: 'centered' },
  args: {
    projects: [LAMP],
    activeId: LAMP.id,
    isLoading: false,
    isError: false,
    onRetry: () => {},
    onSelect: () => {},
    onAction: () => {},
    itemClassName: ACCOUNT_MENU_ITEM,
  },
  render: (args) => (
    <div className="h-80 w-[560px]">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">Account</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-[259px] rounded-xl border-border bg-popover p-1.5"
        >
          <ProjectsSubmenuView {...args} />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  ),
  play: openSubmenu,
} satisfies Meta<typeof ProjectsSubmenuView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OneProject: Story = {};

export const SeveralProjects: Story = {
  args: { projects: [LAMP, SALT, MOTH] },
};

export const LongActiveTitle: Story = {
  args: { projects: [LAMP, SALT, MOTH], activeId: MOTH.id },
};

export const Loading: Story = {
  args: { projects: undefined, isLoading: true },
};

export const LoadError: Story = {
  args: { projects: undefined, isError: true },
};
