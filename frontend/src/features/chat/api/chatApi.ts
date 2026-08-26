import axios from 'axios';

export interface ApiRoom {
  _id: string;
  roomname: string;
  description: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiMessage {
  _id: string;
  userId: string | { _id: string; name: string; username: string };
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

export const chatApi = {
  // Rooms REST API
  async getRooms(): Promise<ApiRoom[]> {
    try {
      const res = await api.get<ApiResponse<ApiRoom[]>>('/rooms');
      return res.data.data || [];
    } catch {
      return [];
    }
  },

  async getRoomById(roomId: string): Promise<ApiRoom | null> {
    try {
      const res = await api.get<ApiResponse<ApiRoom>>(`/rooms/${roomId}`);
      return res.data.data || null;
    } catch {
      return null;
    }
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
  async getMessages(query?: { roomId?: string; limit?: number; page?: number }): Promise<ApiMessage[]> {
    try {
      const res = await api.get<ApiResponse<ApiMessage[]>>('/messages', { params: query });
      return res.data.data || [];
    } catch {
      return [];
    }
  },

  async getMessageById(messageId: string): Promise<ApiMessage | null> {
    try {
      const res = await api.get<ApiResponse<ApiMessage>>(`/messages/${messageId}`);
      return res.data.data || null;
    } catch {
      return null;
    }
  },

  async createMessage(data: { roomId: string; text: string; userId?: string }): Promise<ApiMessage> {
    const res = await api.post<ApiResponse<ApiMessage>>('/messages', data);
    return res.data.data;
  },

  async updateMessage(messageId: string, data: { text: string }): Promise<ApiMessage> {
    const res = await api.put<ApiResponse<ApiMessage>>(`/messages/${messageId}`, data);
    return res.data.data;
  },

  async deleteMessage(messageId: string): Promise<void> {
    await api.delete(`/messages/${messageId}`);
  },
};

export default chatApi;
