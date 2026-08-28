import axios from 'axios';

export interface ApiRoom {
  _id: string;
  roomname: string;
  description: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiMessageUser {
  _id: string;
  name: string;
  username: string;
  avatar?: string;
}

export interface ApiMessage {
  _id: string;
  userId: string | ApiMessageUser;
  roomId: string;
  text: string;
  edited?: boolean;
  deleted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

const api = axios.create({
  baseURL: '/api',
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
      localStorage.removeItem('chatSocial_token');
      localStorage.removeItem('chatSocial_user');
      if (!window.location.pathname.startsWith('/signin') && !window.location.pathname.startsWith('/signup') && window.location.pathname !== '/') {
        window.location.href = '/signin';
      }
    }
    return Promise.reject(error);
  }
);

let inFlightRoomsPromise: Promise<ApiRoom[]> | null = null;
const inFlightMessagesPromises = new Map<string, Promise<ApiMessage[]>>();

export const chatApi = {
  // Rooms REST API
  async getRooms(): Promise<ApiRoom[]> {
    if (inFlightRoomsPromise) {
      return inFlightRoomsPromise;
    }

    inFlightRoomsPromise = (async () => {
      try {
        const res = await api.get<ApiResponse<ApiRoom[]>>('/rooms');
        return res.data.data || [];
      } catch {
        return [];
      } finally {
        setTimeout(() => {
          inFlightRoomsPromise = null;
        }, 1500);
      }
    })();

    return inFlightRoomsPromise;
  },

  async createRoom(data: { roomname: string; description?: string }): Promise<ApiRoom> {
    const res = await api.post<ApiResponse<ApiRoom>>('/rooms', data);
    return res.data.data;
  },

  async updateRoom(roomId: string, data: { roomname?: string; description?: string }): Promise<ApiRoom> {
    const res = await api.put<ApiResponse<ApiRoom>>(`/rooms/${roomId}`, data);
    return res.data.data;
  },

  async deleteRoom(roomId: string): Promise<void> {
    await api.delete(`/rooms/${roomId}`);
  },

  // Messages REST API
  async getMessages(query?: string | { roomId?: string; limit?: number; page?: number }): Promise<ApiMessage[]> {
    const params = typeof query === 'string' ? { roomId: query } : query;
    const key = params?.roomId ? `${params.roomId}_${params.limit || 50}_${params.page || 1}` : 'all';

    if (inFlightMessagesPromises.has(key)) {
      return inFlightMessagesPromises.get(key)!;
    }

    const promise = (async () => {
      try {
        const res = await api.get<ApiResponse<ApiMessage[]>>('/messages', { params });
        if (Array.isArray(res.data)) {
          return res.data;
        }
        return res.data?.data || [];
      } catch (err) {
        console.warn('Failed to fetch messages:', err);
        return [];
      } finally {
        setTimeout(() => {
          inFlightMessagesPromises.delete(key);
        }, 1000);
      }
    })();

    inFlightMessagesPromises.set(key, promise);
    return promise;
  },

  async getRoomMessages(roomId: string, limit: number = 50, page: number = 1): Promise<ApiMessage[]> {
    return this.getMessages({ roomId, limit, page });
  },

  async getMessageById(messageId: string): Promise<ApiMessage | null> {
    try {
      const res = await api.get<ApiResponse<ApiMessage>>(`/messages/${messageId}`);
      return res.data?.data || null;
    } catch {
      return null;
    }
  },

  async createMessage(data: { roomId: string; text: string; userId?: string }): Promise<ApiMessage> {
    const res = await api.post<ApiResponse<ApiMessage>>('/messages', data);
    return res.data.data;
  },

  async updateMessage(messageId: string, data: { text: string } | string): Promise<ApiMessage> {
    const payload = typeof data === 'string' ? { text: data } : data;
    const res = await api.put<ApiResponse<ApiMessage>>(`/messages/${messageId}`, payload);
    return res.data.data;
  },

  async deleteMessage(messageId: string): Promise<void> {
    await api.delete(`/messages/${messageId}`);
  },
};

export default chatApi;
