import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';
import { tokenAtom, userAtom } from '@web/state/auth.atom';
import { setToken, setStoredUser } from '@web/lib/auth';
import { API_URL } from '@web/lib/api';
import { Button } from '@ui/components/ui/button';
import { Input } from '@ui/components/ui/input';
import { Label } from '@ui/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@ui/components/ui/card';

interface AuthResponse {
  token: string;
  user: { id: string; email: string; displayName: string | null };
  error?: string;
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const navigate = useNavigate();
  const setTokenAtom = useSetAtom(tokenAtom);
  const setUserAtom = useSetAtom(userAtom);

  const { mutate, isPending, error } = useMutation({
    mutationFn: async () => {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const body: Record<string, string> = { email, password };
      if (isRegister && displayName) body.displayName = displayName;

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data: AuthResponse = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }
      return data;
    },
    onSuccess: (data) => {
      setToken(data.token);
      setStoredUser(data.user);
      setTokenAtom(data.token);
      setUserAtom(data.user);
      navigate('/');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate();
  };

  const errorMessage =
    error instanceof Error ? error.message : error ? 'Network error. Is the API running?' : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            {isRegister ? 'Create Account' : 'Sign In'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {errorMessage && (
            <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name (optional)</Label>
                <Input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
            )}

            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? 'Loading...' : isRegister ? 'Register' : 'Sign In'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-primary hover:underline"
            >
              {isRegister ? 'Sign In' : 'Register'}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
