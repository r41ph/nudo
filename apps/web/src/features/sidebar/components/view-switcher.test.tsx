import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { ViewSwitcher } from '@web/features/sidebar/components/view-switcher';
import { renderWithProviders } from '@web/test/test-utils';

const PROJECT_ID = 'project-1';
const DOCUMENT_ROUTE = `/project/${PROJECT_ID}/document/doc-1`;
const PLOT_PATH = `/project/${PROJECT_ID}/plot`;

function LocationProbe() {
  return <p data-testid="location">{useLocation().pathname}</p>;
}

function renderAt(initialRoute: string) {
  return renderWithProviders(
    <>
      <Routes>
        <Route path="/project/:projectId/*" element={<ViewSwitcher />} />
        <Route path="*" element={<ViewSwitcher />} />
      </Routes>
      <LocationProbe />
    </>,
    { initialRoute }
  );
}

async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /^View: / }));
  return screen.findByRole('menu');
}

describe('ViewSwitcher', () => {
  it('names the current view on the trigger', () => {
    renderAt(DOCUMENT_ROUTE);
    expect(
      screen.getByRole('button', { name: 'View: Story' })
    ).toBeInTheDocument();
  });

  it('names Plot on the plot route', () => {
    renderAt(PLOT_PATH);
    expect(
      screen.getByRole('button', { name: 'View: Plot' })
    ).toBeInTheDocument();
  });

  it('lists Story, Characters and Plot with no counts, Characters disabled', async () => {
    const user = userEvent.setup();
    renderAt(DOCUMENT_ROUTE);

    const menu = await openMenu(user);

    const items = Array.from(menu.querySelectorAll('[role="menuitem"]'));
    expect(items.map((el) => el.textContent?.trim())).toEqual([
      'Story',
      'Characters',
      'Plot',
    ]);
    expect(
      screen.getByRole('menuitem', { name: 'Characters' })
    ).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('menuitem', { name: 'Story' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getByRole('menuitem', { name: 'Plot' })).not.toHaveAttribute(
      'aria-current'
    );
  });

  it('switches to Plot and back to Story', async () => {
    const user = userEvent.setup();
    renderAt(DOCUMENT_ROUTE);

    await openMenu(user);
    await user.click(screen.getByRole('menuitem', { name: 'Plot' }));

    expect(screen.getByTestId('location')).toHaveTextContent(PLOT_PATH);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'View: Plot' })
    ).toBeInTheDocument();

    await openMenu(user);
    expect(screen.getByRole('menuitem', { name: 'Plot' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    await user.click(screen.getByRole('menuitem', { name: 'Story' }));

    expect(screen.getByTestId('location')).toHaveTextContent(
      `/project/${PROJECT_ID}`
    );
    expect(
      screen.getByRole('button', { name: 'View: Story' })
    ).toBeInTheDocument();
  });

  // Story links to the project root, which would leave the open document.
  it('closes without navigating when the current view is selected', async () => {
    const user = userEvent.setup();
    renderAt(DOCUMENT_ROUTE);

    await openMenu(user);
    await user.click(screen.getByRole('menuitem', { name: 'Story' }));

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(DOCUMENT_ROUTE);
  });

  it('disables every item without a project', async () => {
    const user = userEvent.setup();
    renderAt('/');

    await openMenu(user);

    for (const name of ['Story', 'Characters', 'Plot']) {
      expect(screen.getByRole('menuitem', { name })).toHaveAttribute(
        'aria-disabled',
        'true'
      );
    }
  });

  it('works from the keyboard, skipping Characters', async () => {
    const user = userEvent.setup();
    renderAt(DOCUMENT_ROUTE);
    const trigger = screen.getByRole('button', { name: 'View: Story' });

    trigger.focus();
    await user.keyboard('{Enter}');
    expect(await screen.findByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Story' })).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Plot' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
