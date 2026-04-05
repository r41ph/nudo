import { API_URL } from '@web/shared/lib/api';
import { AUTH_ROUTES } from '@web/features/auth/constants';
import type { AuthResponse, LoginParams, RegisterParams } from '@web/features/auth/types';

export async function loginUser(params: LoginParams): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}${AUTH_ROUTES.LOGIN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data: AuthResponse = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

export async function registerUser(params: RegisterParams): Promise<AuthResponse> {
  const body: Record<string, string> = { email: params.email, password: params.password };
  if (params.displayName) body.displayName = params.displayName;

  const res = await fetch(`${API_URL}${AUTH_ROUTES.REGISTER}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data: AuthResponse = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}
