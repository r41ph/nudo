import { describe, it, expect, vi } from 'vitest';
import {
  getToken,
  setToken,
  removeToken,
  getStoredUser,
  setStoredUser,
  clearAuth,
} from '@web/shared/lib/auth';

describe('auth utilities', () => {
  describe('getToken', () => {
    it('returns null when no token is stored', () => {
      expect(getToken()).toBeNull();
    });

    it('returns the stored token', () => {
      localStorage.setItem('writing_app_token', 'my-token');
      expect(getToken()).toBe('my-token');
    });
  });

  describe('setToken', () => {
    it('stores a token in localStorage', () => {
      setToken('new-token');
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'writing_app_token',
        'new-token'
      );
    });
  });

  describe('removeToken', () => {
    it('removes the token from localStorage', () => {
      localStorage.setItem('writing_app_token', 'to-remove');
      removeToken();
      expect(localStorage.removeItem).toHaveBeenCalledWith(
        'writing_app_token'
      );
      expect(getToken()).toBeNull();
    });
  });

  describe('getStoredUser', () => {
    it('returns null when no user is stored', () => {
      expect(getStoredUser()).toBeNull();
    });

    it('returns the parsed user object', () => {
      const user = { id: '1', email: 'a@b.com', displayName: 'Test' };
      localStorage.setItem('writing_app_user', JSON.stringify(user));
      expect(getStoredUser()).toEqual(user);
    });

    it('returns null when stored value is invalid JSON', () => {
      localStorage.setItem('writing_app_user', 'not-json');
      expect(getStoredUser()).toBeNull();
    });
  });

  describe('setStoredUser', () => {
    it('stores the user as JSON in localStorage', () => {
      const user = { id: '1', email: 'a@b.com', displayName: null };
      setStoredUser(user);
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'writing_app_user',
        JSON.stringify(user)
      );
    });
  });

  describe('clearAuth', () => {
    it('removes both token and user from localStorage', () => {
      localStorage.setItem('writing_app_token', 'token');
      localStorage.setItem('writing_app_user', '{}');
      clearAuth();
      expect(getToken()).toBeNull();
      expect(getStoredUser()).toBeNull();
    });
  });
});
