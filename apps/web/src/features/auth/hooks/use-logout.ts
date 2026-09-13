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
    // Cleared here, not left to the server's Clear-Site-Data: that header is
    // async and network-dependent, so a failed request would leave a live token.
    clearAuth();
    void logoutUser(); // fire-and-forget for Clear-Site-Data header (cache + storage)
    navigate('/login');
  };

  return { logout };
}
