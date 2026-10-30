import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SidebarProvider } from '@ui/components/ui/sidebar';
import { SidebarFooterActions } from '@web/features/sidebar/components/sidebar-footer-actions';
import { userAtom } from '@web/features/auth/state/auth.store';
import { themeAtom } from '@web/shared/state/theme.atom';
import { renderWithProviders, createStore } from '@web/test/test-utils';

const logout = vi.fn();
vi.mock('@web/features/auth/hooks/use-logout', () => ({
  useLogout: () => ({ logout }),
}));

function renderFooter() {
  const store = createStore();
  store.set(userAtom, { id: 'u1', email: 'dev@rgalan.es', displayName: null });
  store.set(themeAtom, 'light');
  renderWithProviders(
    <SidebarProvider>
      <SidebarFooterActions />
    </SidebarProvider>,
    { store }
  );
  return store;
}

async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole('button', { name: 'Account: dev@rgalan.es' })
  );
  return screen.findByRole('menu');
}

describe('SidebarFooterActions', () => {
  // The counts moved to the editor's bottom-right strip; nothing should pull
  // them back into the sidebar.
  it('shows no word counts', () => {
    renderFooter();

    expect(screen.queryByText(/words?$/i)).toBeNull();
    expect(screen.queryByText('total')).toBeNull();
    expect(screen.queryByText('today')).toBeNull();
  });
});

describe('SidebarFooterActions — account menu', () => {
  it('lists the items in order with a single divider above Sign out', async () => {
    const user = userEvent.setup();
    renderFooter();

    const menu = await openMenu(user);

    const labels = Array.from(
      menu.querySelectorAll('[role="menuitem"], [role="menuitemcheckbox"]')
    ).map((el) => el.textContent?.trim());
    expect(labels).toEqual([
      'Dark mode',
      'Projects',
      'Settings',
      'Trash',
      'Help',
      'Keyboard shortcuts',
      'Sign out',
    ]);

    const separators = within(menu).getAllByRole('separator');
    expect(separators).toHaveLength(1);
    expect(separators[0].nextElementSibling?.textContent?.trim()).toBe(
      'Sign out'
    );
  });

  it('signs out from the Sign out item', async () => {
    const user = userEvent.setup();
    renderFooter();

    await openMenu(user);
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }));

    expect(logout).toHaveBeenCalledOnce();
  });

  it('toggles dark mode without closing the menu', async () => {
    const user = userEvent.setup();
    const store = renderFooter();

    const menu = await openMenu(user);
    const toggle = within(menu).getByRole('menuitemcheckbox', {
      name: 'Dark mode',
    });
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    await user.click(toggle);

    expect(store.get(themeAtom)).toBe('dark');
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(
      screen.getByRole('menuitemcheckbox', { name: 'Dark mode' })
    ).toHaveAttribute('aria-checked', 'true');
  });
});
