import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { LoginPage } from '@web/features/auth/components/login-page';
import { renderWithProviders, createStore } from '@web/test/test-utils';
import { tokenAtom, userAtom } from '@web/features/auth/state/auth.store';
import { server } from '@web/test/mocks/server';

describe('LoginPage', () => {
  it('renders the sign-in form by default', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(
      screen.queryByLabelText(/Display Name/)
    ).not.toBeInTheDocument();
  });

  it('toggles to register mode', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);
    await user.click(screen.getByText('Register'));
    expect(screen.getByText('Create Account')).toBeInTheDocument();
    expect(screen.getByLabelText(/Display Name/)).toBeInTheDocument();
  });

  it('submits login and updates atoms on success', async () => {
    const user = userEvent.setup();
    const store = createStore();
    renderWithProviders(<LoginPage />, { store, initialRoute: '/login' });

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(store.get(tokenAtom)).toBe('fake-jwt-token-for-testing');
    });
    expect(store.get(userAtom)).toMatchObject({
      email: 'test@example.com',
    });
  });

  it('shows error message on login failure', async () => {
    server.use(
      http.post('*/auth/login', () => {
        return HttpResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        );
      })
    );

    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText('Email'), 'wrong@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrongpass');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('shows loading state while submitting', async () => {
    // Delay the response to observe loading state
    server.use(
      http.post('*/auth/login', async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return HttpResponse.json({
          token: 'tok',
          user: { id: '1', email: 'a@b.com', displayName: null },
        });
      })
    );

    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
