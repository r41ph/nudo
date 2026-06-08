import type { APIRequestContext } from '@playwright/test';

/**
 * Dedicated e2e ports so the suite never reuses a dev server (which points at
 * the dev database). The web server is launched with VITE_API_URL pointing at
 * API_URL, and the API with DB_NAME=nudo_test — e2e only ever touches the test
 * database.
 */
export const WEB_PORT = 5273;
export const API_PORT = 3101;
export const WEB_URL = `http://localhost:${WEB_PORT}`;
export const API_URL = `http://localhost:${API_PORT}`;

/** Where the setup project writes the authenticated storage state. */
export const STORAGE_STATE = 'playwright/.auth/user.json';

export interface TestUser {
  email: string;
  password: string;
}

/** A unique account so parallel/repeated runs never collide on the unique email. */
export function uniqueUser(): TestUser {
  return {
    email: `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`,
    password: 'password123',
  };
}

export interface RegisteredUser {
  token: string;
  user: { id: string; email: string; displayName: string | null };
  creds: TestUser;
}

/** Register a fresh user through the real API and return the token + user. */
export async function registerUser(
  request: APIRequestContext,
  creds: TestUser = uniqueUser()
): Promise<RegisteredUser> {
  const res = await request.post(`${API_URL}/auth/register`, {
    data: { email: creds.email, password: creds.password },
  });
  if (!res.ok()) {
    throw new Error(`register failed: ${res.status()} ${await res.text()}`);
  }
  const body = await res.json();
  return { token: body.token, user: body.user, creds };
}
