import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { graphql, HttpResponse } from 'msw';
import { toast } from 'sonner';
import { InspectorHost } from '@web/features/document/components/inspector-host';
import { DETAILS_DEBOUNCE_MS } from '@web/features/document/constants/inspector.constants';
import type { DocumentDetails } from '@web/features/document/document.types';
import {
  closeInspectorAtom,
  inspectorFocusRequestedAtom,
  openInspectorAtom,
} from '@web/shared/state/panels.atom';
import { server } from '@web/test/mocks/server';
import { renderWithProviders, createStore } from '@web/test/test-utils';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

const DOC: DocumentDetails = {
  id: 'd1',
  title: 'The Arrival',
  kind: 'document',
  status: null,
  summary: '',
  pov: '',
  notes: '',
  createdAt: '2026-09-01T09:00:00Z',
  updatedAt: '2026-09-01T09:00:00Z',
};

const DOC_2: DocumentDetails = {
  ...DOC,
  id: 'd2',
  title: 'The Departure',
  notes: 'Ask Ines about 1974.',
};

const SEPARATOR: DocumentDetails = {
  ...DOC,
  id: 's1',
  kind: 'separator',
  title: 'Part One',
};

type Save = { id: string; patch: Record<string, unknown> };

function captureSaves({ failures = 0 } = {}) {
  const saves: Save[] = [];
  server.use(
    graphql.mutation('UpdateDocumentDetails', ({ variables }) => {
      saves.push({ id: variables.id, patch: variables.patch });
      if (saves.length <= failures) {
        return HttpResponse.json(
          { errors: [{ message: 'Save failed' }] },
          { status: 500 }
        );
      }
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

function setup(details: DocumentDetails = DOC) {
  const store = createStore();
  store.set(openInspectorAtom);
  store.set(inspectorFocusRequestedAtom, false);
  const view = renderWithProviders(<InspectorHost details={details} />, {
    store,
  });
  return { ...view, store, user: userEvent.setup() };
}

const tab = (name: string) => screen.getByRole('tab', { name });
const notes = () => screen.getByRole('textbox', { name: 'Notes' });

// Shorter than the debounce, so only a flush can have sent the text.
const beforeDebounce = { timeout: DETAILS_DEBOUNCE_MS / 2 };
const afterDebounce = { timeout: DETAILS_DEBOUNCE_MS * 2 };

afterEach(() => {
  vi.mocked(toast.error).mockClear();
});

describe('Notes tab — reaching it', () => {
  it('is reachable with the arrow keys', async () => {
    const { user } = setup();
    act(() => tab('Details').focus());

    await user.keyboard('{ArrowRight}');

    expect(tab('Notes')).toHaveAttribute('aria-selected', 'true');
    expect(notes()).toBeInTheDocument();
  });

  it('is available on a folder', async () => {
    const { user } = setup({ ...DOC, kind: 'folder' });

    await user.click(tab('Notes'));

    expect(notes()).toBeInTheDocument();
  });

  it('is not offered on a separator', () => {
    setup(SEPARATOR);

    expect(screen.queryByRole('tablist')).toBeNull();
  });
});

describe('Notes tab — the field', () => {
  it('shows only the placeholder when the note is empty', async () => {
    const { user } = setup();

    await user.click(tab('Notes'));

    expect(notes()).toHaveValue('');
    expect(notes()).toHaveAttribute(
      'placeholder',
      'Research, reminders, loose ends…'
    );
  });

  it('shows the saved note', async () => {
    const { user } = setup(DOC_2);

    await user.click(tab('Notes'));

    expect(notes()).toHaveValue('Ask Ines about 1974.');
  });
});

describe('Notes tab — saving', () => {
  it('saves after a pause and reports it', async () => {
    const saves = captureSaves();
    const { user } = setup();

    await user.click(tab('Notes'));
    await user.type(notes(), 'Tide tables');
    expect(saves).toEqual([]);

    await waitFor(
      () =>
        expect(saves).toEqual([{ id: 'd1', patch: { notes: 'Tide tables' } }]),
      afterDebounce
    );
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Saved')
    );
  });

  it('keeps pending notes across a tab switch and saves them once', async () => {
    const saves = captureSaves();
    const { user } = setup();

    await user.click(tab('Notes'));
    await user.type(notes(), 'Tide tables');
    await user.click(tab('Details'));
    await user.click(tab('Notes'));

    expect(notes()).toHaveValue('Tide tables');
    await waitFor(
      () =>
        expect(saves).toEqual([{ id: 'd1', patch: { notes: 'Tide tables' } }]),
      afterDebounce
    );
  });

  it('keeps pending Summary and POV across a tab switch', async () => {
    const saves = captureSaves();
    const { user } = setup();

    await user.type(screen.getByLabelText('Summary'), 'Rain');
    await user.type(screen.getByLabelText('POV'), 'Mara');
    await user.click(tab('Notes'));
    await user.click(tab('Details'));

    expect(screen.getByLabelText('Summary')).toHaveValue('Rain');
    expect(screen.getByLabelText('POV')).toHaveValue('Mara');
    await waitFor(
      () =>
        expect(saves).toEqual([
          { id: 'd1', patch: { summary: 'Rain', pov: 'Mara' } },
        ]),
      afterDebounce
    );
  });

  it('sends a pending note when the panel closes', async () => {
    const saves = captureSaves();
    const { store, user } = setup();

    await user.click(tab('Notes'));
    await user.type(notes(), 'Tide tables');
    act(() => store.set(closeInspectorAtom));

    await waitFor(
      () =>
        expect(saves).toEqual([{ id: 'd1', patch: { notes: 'Tide tables' } }]),
      beforeDebounce
    );
  });

  it('closes on Escape from the note and sends what is pending', async () => {
    const saves = captureSaves();
    const { user } = setup();

    await user.click(tab('Notes'));
    await user.type(notes(), 'Tide tables');
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('tablist')).toBeNull();
    await waitFor(
      () =>
        expect(saves).toEqual([{ id: 'd1', patch: { notes: 'Tide tables' } }]),
      beforeDebounce
    );
  });

  it('sends a pending note to the previous document on a switch', async () => {
    const saves = captureSaves();
    const { rerender, user } = setup();

    await user.click(tab('Notes'));
    await user.type(notes(), 'Tide tables');
    rerender(<InspectorHost details={DOC_2} />);

    await waitFor(
      () =>
        expect(saves).toEqual([{ id: 'd1', patch: { notes: 'Tide tables' } }]),
      beforeDebounce
    );
  });

  it('keeps the text, toasts and retries with the latest text on failure', async () => {
    const saves = captureSaves({ failures: 1 });
    const { user } = setup();

    await user.click(tab('Notes'));
    await user.type(notes(), 'Tide');
    const status = screen.getByRole('status');
    await waitFor(
      () => expect(status).toHaveTextContent("Couldn't save"),
      afterDebounce
    );
    expect(notes()).toHaveValue('Tide');
    expect(toast.error).toHaveBeenCalledWith(
      'Could not save details — try again.',
      { id: 'inspector-save-error' }
    );

    await user.type(notes(), ' tables');
    await user.click(within(status).getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(status).toHaveTextContent('Saved'));
    expect(saves).toEqual([
      { id: 'd1', patch: { notes: 'Tide' } },
      { id: 'd1', patch: { notes: 'Tide tables' } },
    ]);
  });
});

describe('Notes tab — staying on it', () => {
  it('stays active across a document switch, with focus unmoved', async () => {
    const { rerender, user } = setup();
    await user.click(tab('Notes'));

    rerender(<InspectorHost details={DOC_2} />);

    expect(tab('Notes')).toHaveAttribute('aria-selected', 'true');
    expect(notes()).toHaveValue('Ask Ines about 1974.');
    // The focused tab left with the old panel's key, so focus falls back to the
    // body unless something in the new panel took it.
    expect(document.body).toHaveFocus();
  });

  it('comes back after passing through a separator', async () => {
    const { rerender, user } = setup();
    await user.click(tab('Notes'));

    rerender(<InspectorHost details={SEPARATOR} />);
    expect(screen.queryByRole('tablist')).toBeNull();

    rerender(<InspectorHost details={DOC_2} />);
    expect(tab('Notes')).toHaveAttribute('aria-selected', 'true');
  });

  it('gives way to the row menu: Details opens with focus on Title', async () => {
    const { store, user } = setup();
    await user.click(tab('Notes'));

    act(() => store.set(openInspectorAtom));

    expect(tab('Details')).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => expect(screen.getByLabelText('Title')).toHaveFocus());
  });

  it('reopens on Details after closing', async () => {
    const { store, user } = setup();
    await user.click(tab('Notes'));

    act(() => store.set(closeInspectorAtom));
    act(() => store.set(openInspectorAtom));

    expect(tab('Details')).toHaveAttribute('aria-selected', 'true');
  });
});
