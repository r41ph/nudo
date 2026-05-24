import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { SaveBar } from '@web/shared/components/save-bar';
import { renderWithProviders, createStore } from '@web/test/test-utils';
import {
  saveStatusAtom,
  lastSavedAtom,
} from '@web/shared/state/save-status.atom';

describe('SaveBar', () => {
  it('shows nothing for idle status', () => {
    renderWithProviders(<SaveBar />);
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
  });

  it('shows "Unsaved changes" for unsaved status', () => {
    const store = createStore();
    store.set(saveStatusAtom, 'unsaved');
    renderWithProviders(<SaveBar />, { store });
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
  });

  it('shows "Saving..." for saving status', () => {
    const store = createStore();
    store.set(saveStatusAtom, 'saving');
    renderWithProviders(<SaveBar />, { store });
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('shows "Saved" for saved status', () => {
    const store = createStore();
    store.set(saveStatusAtom, 'saved');
    renderWithProviders(<SaveBar />, { store });
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it('shows "Save failed" for error status', () => {
    const store = createStore();
    store.set(saveStatusAtom, 'error');
    renderWithProviders(<SaveBar />, { store });
    expect(screen.getByText('Save failed')).toBeInTheDocument();
  });

  it('shows last saved time when available', () => {
    const store = createStore();
    store.set(saveStatusAtom, 'saved');
    store.set(lastSavedAtom, new Date('2026-01-01T12:30:00'));
    renderWithProviders(<SaveBar />, { store });
    expect(screen.getByText(/Last saved:/)).toBeInTheDocument();
  });

  it('does not show last saved time when null', () => {
    renderWithProviders(<SaveBar />);
    expect(screen.queryByText(/Last saved:/)).not.toBeInTheDocument();
  });
});
