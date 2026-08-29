import { useState, useCallback, useEffect } from 'react';
import { authService, User, LoginCredentials, RegisterCredentials } from '../api/authService';

export interface UseAuthReturn {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isVerifying: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<User>;
  register: (credentials: RegisterCredentials) => Promise<User>;
  logout: () => void;
  updateProfile: (updated: Partial<User>) => void;
  clearError: () => void;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(() => authService.getStoredUser());
  const [token, setToken] = useState<string | null>(() => authService.getToken());
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(() => {
    const t = authService.getToken();
    const u = authService.getStoredUser();
    return Boolean(t && !u);
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    const storedToken = authService.getToken();
    if (!storedToken) return;

    authService.getMe().then((remoteUser) => {
      if (!isCancelled) {
        if (remoteUser) {
          setUser(remoteUser);
          setToken(storedToken);
        } else {
          setUser(null);
          setToken(null);
          authService.logout();
        }
        setIsVerifying(false);
      }
    }).catch(() => {
      if (!isCancelled) {
        setIsVerifying(false);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authService.login(credentials);
      setUser(res.user);
      setToken(res.token);
      setIsLoading(false);
      setIsVerifying(false);
      return res.user;
    } catch (err: unknown) {
      setIsLoading(false);
      setIsVerifying(false);
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg);
      throw err;
    }
  }, []);

  const register = useCallback(async (credentials: RegisterCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authService.register(credentials);
      setUser(res.user);
      setToken(res.token);
      setIsLoading(false);
      setIsVerifying(false);
      return res.user;
    } catch (err: unknown) {
      setIsLoading(false);
      setIsVerifying(false);
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setError(msg);
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setToken(null);
    setError(null);
    setIsVerifying(false);
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
    isAuthenticated: Boolean(user && token),
    isLoading,
    isVerifying,
    error,
    login,
    register,
    logout,
    updateProfile,
    clearError,
  };
}

export default useAuth;
