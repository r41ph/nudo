import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';
import { tokenAtom, userAtom } from '@web/features/auth/state/auth.store';
import { setToken, setStoredUser } from '@web/shared/lib/auth';
import { loginUser, registerUser } from '@web/features/auth/api/auth.api';
import type { AuthResponse } from '@web/features/auth/auth.types';

export function useAuth() {
  const navigate = useNavigate();
  const setTokenAtom = useSetAtom(tokenAtom);
  const setUserAtom = useSetAtom(userAtom);

  const onSuccess = (data: AuthResponse) => {
    setToken(data.token);
    setStoredUser(data.user);
    setTokenAtom(data.token);
    setUserAtom(data.user);
    navigate('/');
  };

  const login = useMutation({
    mutationFn: loginUser,
    onSuccess,
  });

  const register = useMutation({
    mutationFn: registerUser,
    onSuccess,
  });

  return { login, register };
}
