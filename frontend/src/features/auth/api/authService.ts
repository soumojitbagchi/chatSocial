import chatStorage from '../../chat/api/chatStorage';
import axios from 'axios';

export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  username: string;
  avatar?: string;
  phone?: string;
  about?: string;
}

export interface AuthResponse {
  message: string;
  success: boolean;
  user: User;
  token: string;
}

const API_BASE = '/api';

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('chatSocial_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const isAuthEndpoint = error.config?.url?.includes('/auth/signin') || error.config?.url?.includes('/auth/signup');
      if (!isAuthEndpoint) {
        localStorage.removeItem('chatSocial_token');
        localStorage.removeItem('chatSocial_user');
        if (!window.location.pathname.startsWith('/signin') && !window.location.pathname.startsWith('/signup') && window.location.pathname !== '/') {
          window.location.href = '/signin';
        }
      }
    }
    return Promise.reject(error);
  }
);

export interface LoginCredentials {
  email?: string;
  username?: string;
  identifier?: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  username?: string;
  phone?: string;
}

export const authService = {
  async register(data: RegisterCredentials): Promise<AuthResponse> {
    try {
      const cleanEmail = data.email.trim().toLowerCase();
      const cleanName = data.name.trim();
      const cleanNumber = data.phone?.trim() || '';
      const fallbackUsername = cleanEmail.split('@')[0] || `user_${Date.now()}`;
      const cleanUsername = (data.username?.trim() || fallbackUsername).toLowerCase().replace(/[^a-z0-9_.]/g, '_');

      const res = await api.post<AuthResponse>('/auth/signup', {
        name: cleanName,
        email: cleanEmail,
        password: data.password,
        username: cleanUsername,
        phone: cleanNumber,
      });

      if (res.data.success && res.data.user) {
        const userObj: User = {
          ...res.data.user,
          id: String(res.data.user.id || res.data.user._id || ''),
        };
        localStorage.setItem('chatSocial_user', JSON.stringify(userObj));
        if (res.data.token) {
          localStorage.setItem('chatSocial_token', res.data.token);
        }
        return { ...res.data, user: userObj };
      }
      throw new Error(res.data.message || 'Registration failed');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const errorData = err.response?.data;
        if (errorData?.message) {
          throw new Error(errorData.message);
        }
        if (Array.isArray(errorData?.errors) && errorData.errors.length > 0) {
          const firstErr = errorData.errors[0];
          throw new Error(firstErr.msg || firstErr.message || 'Validation error');
        }
        if (err.message === 'Network Error' || !err.response) {
          throw new Error('Unable to connect to server. Please check your internet connection.');
        }
      }
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('Failed to register account');
    }
  },

  async login(data: LoginCredentials): Promise<AuthResponse> {
    try {
      const loginId = (data.identifier || data.email || data.username || '').trim();
      const isEmail = loginId.includes('@');

      const payload: Record<string, string> = {
        password: data.password,
        identifier: loginId,
      };

      if (isEmail) {
        payload.email = loginId;
      } else {
        payload.username = loginId;
      }

      const res = await api.post<AuthResponse>('/auth/signin', payload);

      if (res.data.success && res.data.user) {
        const userObj: User = {
          ...res.data.user,
          id: String(res.data.user.id || res.data.user._id || ''),
        };
        localStorage.setItem('chatSocial_user', JSON.stringify(userObj));
        if (res.data.token) {
          localStorage.setItem('chatSocial_token', res.data.token);
        }
        return { ...res.data, user: userObj };
      }
      throw new Error(res.data.message || 'Login failed');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const errorData = err.response?.data;
        if (errorData?.message) {
          throw new Error(errorData.message);
        }
        if (Array.isArray(errorData?.errors) && errorData.errors.length > 0) {
          const firstErr = errorData.errors[0];
          throw new Error(firstErr.msg || firstErr.message || 'Validation error');
        }
        if (err.message === 'Network Error' || !err.response) {
          throw new Error('Unable to connect to server. Please check your internet connection.');
        }
      }
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('Invalid credentials');
    }
  },

  async getMe(): Promise<User | null> {
    try {
      const token = this.getToken();
      if (!token) return null;
      const res = await api.get<{ success: boolean; user: User }>('/auth/me');
      if (res.data.success && res.data.user) {
        const userObj: User = {
          ...res.data.user,
          id: String(res.data.user.id || res.data.user._id || ''),
        };
        localStorage.setItem('chatSocial_user', JSON.stringify(userObj));
        return userObj;
      }
      return null;
    } catch {
      return null;
    }
  },

  getStoredUser(): User | null {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem('chatSocial_user');
      if (saved) {
        return JSON.parse(saved);
      }
      return null;
    } catch {
      return null;
    }
  },

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('chatSocial_token');
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch {
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('chatSocial_user');
        localStorage.removeItem('chatSocial_token');
        chatStorage.clearAll();
      }
    }
  },
};

export default authService;
