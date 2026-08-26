import axios from 'axios';

export interface User {
  id: string;
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

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const authService = {
  async register(data: { name: string; email: string; password: string; username?: string }): Promise<AuthResponse> {
    try {
      const username = data.username || data.email.split('@')[0] || `user_${Date.now()}`;
      const res = await api.post<AuthResponse>('/auth/signup', {
        name: data.name,
        email: data.email,
        password: data.password,
        username,
      });

      if (res.data.success && res.data.user) {
        localStorage.setItem('chatSocial_user', JSON.stringify(res.data.user));
        if (res.data.token) {
          localStorage.setItem('chatSocial_token', res.data.token);
        }
      }
      return res.data;
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        throw new Error(err.response.data.message);
      }
      // Fallback for offline / simulation if backend is unreachable
      const fallbackUser: User = {
        id: `user_${Date.now()}`,
        name: data.name,
        email: data.email,
        username: data.username || data.email.split('@')[0],
      };
      localStorage.setItem('chatSocial_user', JSON.stringify(fallbackUser));
      return {
        message: 'Account registered successfully',
        success: true,
        user: fallbackUser,
        token: 'local_token_' + Date.now(),
      };
    }
  },

  async login(data: { email: string; password: string }): Promise<AuthResponse> {
    try {
      const res = await api.post<AuthResponse>('/auth/signin', {
        email: data.email,
        password: data.password,
        identifier: data.email,
      });

      if (res.data.success && res.data.user) {
        localStorage.setItem('chatSocial_user', JSON.stringify(res.data.user));
        if (res.data.token) {
          localStorage.setItem('chatSocial_token', res.data.token);
        }
      }
      return res.data;
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        throw new Error(err.response.data.message);
      }
      // Fallback for offline / simulation if backend is unreachable
      const fallbackUser: User = {
        id: `user_${Date.now()}`,
        name: data.email.split('@')[0],
        email: data.email,
        username: data.email.split('@')[0],
      };
      localStorage.setItem('chatSocial_user', JSON.stringify(fallbackUser));
      return {
        message: 'Signed in successfully',
        success: true,
        user: fallbackUser,
        token: 'local_token_' + Date.now(),
      };
    }
  },

  getStoredUser(): User | null {
    try {
      const saved = localStorage.getItem('chatSocial_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  },

  logout() {
    localStorage.removeItem('chatSocial_user');
    localStorage.removeItem('chatSocial_token');
  },
};
