import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { Provider as JotaiProvider, createStore } from 'jotai';
import { SidebarProvider } from '@ui/components/ui/sidebar';
import { userAtom } from '@web/features/auth/state/auth.store';
import { SidebarFooterActions } from '@web/features/sidebar/components/sidebar-footer-actions';

function createStoryStore() {
  const store = createStore();
  store.set(userAtom, {
    id: 'u1',
    email: 'ralph@rgalan.es',
    displayName: null,
  });
  return store;
}

const meta = {
  title: 'Sidebar/SidebarFooterActions',
  component: SidebarFooterActions,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <JotaiProvider store={createStoryStore()}>
        <MemoryRouter>
          <SidebarProvider>
            <div className="w-[244px] bg-sidebar">
              <Story />
            </div>
          </SidebarProvider>
        </MemoryRouter>
      </JotaiProvider>
    ),
  ],
} satisfies Meta<typeof SidebarFooterActions>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AccountMenuOpen: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Account: ralph@rgalan.es' })
    );
  },
};
