import { useState, useCallback } from 'react';
import { authService, User } from '../api/authService';

export interface UseAuthReturn {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: { email: string; password: string }) => Promise<User>;
  register: (credentials: { name: string; email: string; password: string; username?: string }) => Promise<User>;
  logout: () => void;
  updateProfile: (updated: Partial<User>) => void;
  clearError: () => void;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(() => authService.getStoredUser());
  const [token, setToken] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('chatSocial_token') : null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (credentials: { email: string; password: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authService.login(credentials);
      setUser(res.user);
      setToken(res.token);
      setIsLoading(false);
      return res.user;
    } catch (err: unknown) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const register = useCallback(async (credentials: { name: string; email: string; password: string; username?: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authService.register(credentials);
      setUser(res.user);
      setToken(res.token);
      setIsLoading(false);
      return res.user;
    } catch (err: unknown) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setToken(null);
  }, []);

  const updateProfile = useCallback((updated: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const nextUser = { ...prev, ...updated };
      localStorage.setItem('chatSocial_user', JSON.stringify(nextUser));
      return nextUser;
    });
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    user,
    token,
    isAuthenticated: Boolean(user),
    isLoading,
    error,
    login,
    register,
    logout,
    updateProfile,
    clearError,
  };
}

export default useAuth;
