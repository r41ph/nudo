const TOKEN_KEY = 'writing_app_token';
const USER_KEY = 'writing_app_user';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// Synchronously clears auth data from localStorage as the primary logout defence.
// The server also returns Clear-Site-Data: "cache", "storage" on POST /auth/logout,
// but that header is processed asynchronously and depends on the network request
// succeeding. If the request fails or the browser doesn't support the directive,
// calling this function ensures the token is never reused on the next page load.
export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
