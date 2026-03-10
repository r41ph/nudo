import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SaveBar } from './save-bar';
import {
  renderWithProviders,
  createStore,
} from '@web/test/test-utils';
import { saveStatusAtom, lastSavedAtom } from '@web/state/save-status.atom';

describe('SaveBar', () => {
  it('shows "Unsaved changes" for idle status', () => {
    renderWithProviders(<SaveBar onSave={vi.fn()} />);
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
  });

  it('shows "Saving..." for saving status', () => {
    const store = createStore();
    store.set(saveStatusAtom, 'saving');
    renderWithProviders(<SaveBar onSave={vi.fn()} />, { store });
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('shows "Saved" for saved status', () => {
    const store = createStore();
    store.set(saveStatusAtom, 'saved');
    renderWithProviders(<SaveBar onSave={vi.fn()} />, { store });
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it('shows "Save failed" for error status', () => {
    const store = createStore();
    store.set(saveStatusAtom, 'error');
    renderWithProviders(<SaveBar onSave={vi.fn()} />, { store });
    expect(screen.getByText('Save failed')).toBeInTheDocument();
  });

  it('shows last saved time when available', () => {
    const store = createStore();
    store.set(saveStatusAtom, 'saved');
    store.set(lastSavedAtom, new Date('2026-01-01T12:30:00'));
    renderWithProviders(<SaveBar onSave={vi.fn()} />, { store });
    expect(screen.getByText(/Last saved:/)).toBeInTheDocument();
  });

  it('does not show last saved time when null', () => {
    renderWithProviders(<SaveBar onSave={vi.fn()} />);
    expect(screen.queryByText(/Last saved:/)).not.toBeInTheDocument();
  });

  it('calls onSave when Save button is clicked', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<SaveBar onSave={onSave} />);
    await user.click(screen.getByText('Save'));
    expect(onSave).toHaveBeenCalledOnce();
  });
});
