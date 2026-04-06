export interface LoginParams {
  email: string;
  password: string;
}

export interface RegisterParams extends LoginParams {
  displayName?: string;
}

export interface AuthResponse {
  token: string;
  user: { id: string; email: string; displayName: string | null };
  error?: string;
}
