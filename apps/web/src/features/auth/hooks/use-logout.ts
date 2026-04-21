import { useSetAtom } from 'jotai';
import { useNavigate } from 'react-router-dom';
import { tokenAtom, userAtom } from '@web/features/auth/state/auth.store';
import { clearAuth } from '@web/shared/lib/auth';
import { logoutUser } from '@web/features/auth/api/auth.api';

export function useLogout() {
  const setToken = useSetAtom(tokenAtom);
  const setUser = useSetAtom(userAtom);
  const navigate = useNavigate();

  const logout = () => {
    setToken(null);
    setUser(null);
    // Synchronously clear localStorage as primary defence.
    // Clear-Site-Data (sent by the server) is async and network-dependent —
    // if the request fails or the browser doesn't support the directive,
    // a stale token would persist and re-authenticate the user on next load.
    clearAuth();
    void logoutUser(); // fire-and-forget for Clear-Site-Data header (cache + storage)
    navigate('/login');
  };

  return { logout };
}
