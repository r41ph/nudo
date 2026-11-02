import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import AppRoutes from '@web/app/routes/router';
import { tokenAtom } from '@web/features/auth/state/auth.store';
import { renderWithProviders, createStore } from '@web/test/test-utils';
import { MOCK_PROJECT, MOCK_TOKEN } from '@web/test/mocks/fixtures';
import { plotPath } from '@web/shared/lib/routes';

describe('AppRoutes', () => {
  it('renders the plot page at the project plot route', async () => {
    const store = createStore();
    store.set(tokenAtom, MOCK_TOKEN);

    renderWithProviders(<AppRoutes />, {
      store,
      initialRoute: plotPath(MOCK_PROJECT.id),
    });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Plot' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'View: Plot' })
    ).toBeInTheDocument();
  });
});
