import { describe, it, expect } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { graphql, HttpResponse } from 'msw';
import { InspectorHost } from '@web/features/document/components/inspector-host';
import { DETAILS_DEBOUNCE_MS } from '@web/features/document/constants/inspector.constants';
import type { DocumentDetails } from '@web/features/document/document.types';
import {
  inspectorAtom,
  openInspectorAtom,
  setInspectorCollapsedAtom,
} from '@web/shared/state/panels.atom';
import { setViewportWidth } from '@web/test/media';
import { server } from '@web/test/mocks/server';
import { renderWithProviders, createStore } from '@web/test/test-utils';

const DOC: DocumentDetails = {
  id: 'd1',
  title: 'The Arrival',
  kind: 'document',
  status: null,
  summary: '',
  pov: '',
  createdAt: '2026-09-01T09:00:00Z',
  updatedAt: '2026-09-01T09:00:00Z',
};

const DOC_2: DocumentDetails = { ...DOC, id: 'd2', title: 'The Departure' };

type Save = { id: string; patch: Record<string, unknown> };

function captureSaves() {
  const saves: Save[] = [];
  server.use(
    graphql.mutation('UpdateDocumentDetails', ({ variables }) => {
      saves.push({ id: variables.id, patch: variables.patch });
      return HttpResponse.json({
        data: {
          updateDocumentById: {
            document: { ...DOC, id: variables.id, ...variables.patch },
          },
        },
      });
    })
  );
  return saves;
}

function setup() {
  const store = createStore();
  store.set(openInspectorAtom);
  const view = renderWithProviders(<InspectorHost details={DOC} />, { store });
  return { ...view, store, user: userEvent.setup() };
}

// Shorter than the debounce, so only a flush can have sent the text.
const beforeDebounce = { timeout: DETAILS_DEBOUNCE_MS / 2 };

describe('InspectorHost — pending text', () => {
  it('is sent when the panel is closed', async () => {
    const saves = captureSaves();
    const { user } = setup();

    await user.type(screen.getByLabelText('Summary'), 'Rain');
    await user.click(screen.getByRole('button', { name: 'Close details' }));

    await waitFor(
      () => expect(saves).toEqual([{ id: 'd1', patch: { summary: 'Rain' } }]),
      beforeDebounce
    );
  });

  it('is sent to the previous document on a switch', async () => {
    const saves = captureSaves();
    const { user, rerender } = setup();

    await user.type(screen.getByLabelText('Summary'), 'Rain');
    rerender(<InspectorHost details={DOC_2} />);

    await waitFor(
      () => expect(saves).toEqual([{ id: 'd1', patch: { summary: 'Rain' } }]),
      beforeDebounce
    );
    expect(screen.getByLabelText('Summary')).toHaveValue('');
  });
});

const panel = () =>
  screen.getByRole('complementary', { name: 'Document details' });
const scrim = () => screen.queryByTestId('side-panel-scrim');

describe('InspectorHost — at or above 1280px', () => {
  it('pushes the page aside with no scrim', () => {
    setup();

    expect(panel()).not.toHaveAttribute('data-state');
    expect(scrim()).toBeNull();
  });
});

describe('InspectorHost — below 1280px', () => {
  it('slides over the page with a scrim', () => {
    setViewportWidth(1024);
    setup();

    expect(panel()).toHaveAttribute('data-state', 'expanded');
    expect(scrim()).toBeInTheDocument();
  });

  it('collapses, not closes, when the scrim is clicked', async () => {
    setViewportWidth(1024);
    const { store, user } = setup();

    await user.click(scrim() as HTMLElement);

    expect(store.get(inspectorAtom)).toMatchObject({
      isOpen: true,
      collapsed: true,
    });
    expect(panel()).toHaveAttribute('inert');
    expect(scrim()).toBeNull();
  });

  // Collapsing keeps the panel mounted, so the unmount flush never runs.
  it('sends pending text when collapsed', async () => {
    setViewportWidth(1024);
    const saves = captureSaves();
    const { store, user } = setup();

    await user.type(screen.getByLabelText('Summary'), 'Rain');
    act(() => store.set(setInspectorCollapsedAtom, true));

    await waitFor(
      () => expect(saves).toEqual([{ id: 'd1', patch: { summary: 'Rain' } }]),
      beforeDebounce
    );
  });

  it('switches to push mode when the viewport grows past 1280px', () => {
    setViewportWidth(1024);
    setup();

    act(() => setViewportWidth(1440));

    expect(panel()).not.toHaveAttribute('data-state');
    expect(scrim()).toBeNull();
  });
});
