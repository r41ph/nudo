import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SidePanel } from '@web/shared/components/side-panel';

function renderPanel(
  collapsed: boolean,
  side: 'left' | 'right' = 'right',
  onCollapse = vi.fn()
) {
  render(
    <SidePanel
      id="panel"
      side={side}
      width="336px"
      label="Document details"
      collapsed={collapsed}
      onCollapse={onCollapse}
    >
      <button type="button">Close details</button>
    </SidePanel>
  );
  return screen.getByRole('complementary', { name: 'Document details' });
}

describe('SidePanel', () => {
  it('is a named landmark that toggles can point at', () => {
    const panel = renderPanel(false);

    expect(panel).toHaveAttribute('id', 'panel');
  });

  it('keeps its contents reachable while expanded', () => {
    const panel = renderPanel(false);

    expect(panel).not.toHaveAttribute('inert');
    expect(panel).toHaveAttribute('data-state', 'expanded');
  });

  // inert, not aria-hidden: it also takes the fields out of the tab order, and
  // aria-hidden on a panel that still holds focus makes browsers warn.
  it('takes its contents out of reach while collapsed', () => {
    const panel = renderPanel(true);

    expect(panel).toHaveAttribute('inert');
    expect(panel).not.toHaveAttribute('aria-hidden');
    expect(panel).toHaveAttribute('data-state', 'collapsed');
  });

  it('records which edge it slides from', () => {
    expect(renderPanel(true, 'left')).toHaveAttribute('data-side', 'left');
  });

  it('collapses when the scrim is clicked', async () => {
    const onCollapse = vi.fn();
    renderPanel(false, 'right', onCollapse);

    await userEvent.click(screen.getByTestId('side-panel-scrim'));

    expect(onCollapse).toHaveBeenCalledOnce();
  });

  it('leaves the page uncovered while collapsed', () => {
    renderPanel(true);

    expect(screen.queryByTestId('side-panel-scrim')).toBeNull();
  });
});
