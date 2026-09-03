import axios from 'axios';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data: T;
  [key: string]: unknown;
}

export interface ApiRoom {
  _id: string;
  id?: string;
  roomname: string;
  description: string;
  createdBy?: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiMessageUser {
  _id: string;
  name: string;
  username: string;
  avatar?: string;
}
export interface UserProfileResult {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar?: string;
  about?: string;
  phone?: string;
  connectionStatus: 'connected' | 'pending_sent' | 'pending_received' | 'none';
  roomId?: string | null;
  online?: boolean;
  requestedAt?: string;
}

export interface ConnectionsData {
  contacts: UserProfileResult[];
  pendingIncoming: UserProfileResult[];
  pendingOutgoing: UserProfileResult[];
}

export interface ApiMessage {
  _id: string;
  userId: string | ApiMessageUser;
  roomId: string;
  text: string;
  type?: string;
  meta?: Record<string, unknown>;
  edited?: boolean;
  deleted?: boolean;
  createdAt: string;
  updatedAt: string;
}
const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const api = axios.create({
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
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
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
  async getProfile(): Promise<UserProfileResult> {
    const res = await api.get<ApiResponse<UserProfileResult>>('/user/profile');
    return res.data.data;
  },

  async updateProfile(data: { name?: string; username?: string; about?: string; avatar?: string; phone?: string; profile?: Record<string, unknown> }): Promise<UserProfileResult> {
    const res = await api.put<ApiResponse<UserProfileResult>>('/user/profile', data);
    return res.data.data;
  },

  async uploadAvatar(file: File | Blob, fileName?: string): Promise<{ avatar: string; user?: UserProfileResult }> {
    const formData = new FormData();
    formData.append('avatar', file, fileName || 'avatar.png');
    const res = await api.post<ApiResponse<UserProfileResult & { avatar: string }>>('/user/avatar', formData);
    return {
      avatar: String(res.data.avatar || res.data.data?.avatar || ''),
      user: res.data.data,
    };
  },
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

  async getRoom(roomId: string): Promise<ApiRoom & { members?: Array<{ _id?: string; id?: string; name?: string; username?: string; avatar?: string; phone?: string; about?: string } | string>; admins?: Array<{ _id?: string; id?: string } | string>; createdBy?: string; avatar?: string }> {
    const res = await api.get<ApiResponse<ApiRoom & { members?: Array<{ _id?: string; id?: string; name?: string; username?: string; avatar?: string; phone?: string; about?: string } | string>; admins?: Array<{ _id?: string; id?: string } | string>; createdBy?: string; avatar?: string }>>(`/rooms/${roomId}`);
    return res.data.data;
  },

  async createRoom(data: { roomname: string; description?: string; isPrivate?: boolean; members?: string[]; avatar?: string }): Promise<ApiRoom> {
    const res = await api.post<ApiResponse<ApiRoom>>('/rooms', data);
    return res.data.data;
  },

  async addRoomMember(roomId: string, targetUserId: string): Promise<ApiRoom> {
    const res = await api.post<ApiResponse<ApiRoom>>(`/rooms/${roomId}/members`, { targetUserId });
    return res.data.data;
  },

  async removeRoomMember(roomId: string, targetUserId: string): Promise<ApiRoom> {
    const res = await api.delete<ApiResponse<ApiRoom>>(`/rooms/${roomId}/members/${targetUserId}`);
    return res.data.data;
  },

  async updateRoom(roomId: string, data: { roomname?: string; description?: string; avatar?: string }): Promise<ApiRoom> {
    const res = await api.put<ApiResponse<ApiRoom>>(`/rooms/${roomId}`, data);
    return res.data.data;
  },

  async deleteRoom(roomId: string): Promise<void> {
    await api.delete(`/rooms/${roomId}`);
  },

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

  async createMessage(data: { roomId: string; text: string; type?: string; meta?: Record<string, unknown>; userId?: string }): Promise<ApiMessage> {
    const res = await api.post<ApiResponse<ApiMessage>>('/messages', data);
    return res.data.data;
  },

  async updateMessage(messageId: string, data: { text: string } | string): Promise<ApiMessage> {
    const payload = typeof data === 'string' ? { text: data } : data;
    const res = await api.put<ApiResponse<ApiMessage>>(`/messages/${messageId}`, payload);
    return res.data.data;
  },
  async deleteMessage(messageId: string, deleteType: 'forMe' | 'forEveryone' = 'forEveryone'): Promise<void> {
    await api.delete(`/messages/${messageId}?deleteType=${deleteType}`);
  },

  async uploadAttachment(file: File | Blob, fileName?: string): Promise<{ url: string; fileId?: string; fileName: string; fileSize: string; fileType: string; name: string }> {
    const formData = new FormData();
    formData.append('file', file, fileName || (file instanceof File ? file.name : 'attachment'));
    const res = await api.post<ApiResponse<{ url: string; fileId?: string; fileName: string; fileSize: string; fileType: string; name: string }>>('/messages/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data.data;
  },

  async searchUsers(query: string = ''): Promise<UserProfileResult[]> {
    try {
      const res = await api.get<ApiResponse<UserProfileResult[]>>('/users/search', { params: { q: query } });
      return res.data?.data || [];
    } catch (err) {
      console.warn('Failed to search users:', err);
      return [];
    }
  },

  async sendConnectionRequest(targetUserId: string): Promise<{ success: boolean; message: string; status: string }> {
    const res = await api.post<ApiResponse<{ status: string }>>('/users/connect', { targetUserId });
    return {
      success: res.data?.success || false,
      message: res.data?.message || 'Connection request sent',
      status: 'pending_sent',
    };
  },

  async acceptConnectionRequest(targetUserId: string): Promise<{ success: boolean; message: string; status: string; room?: ApiRoom }> {
    const res = await api.post<ApiResponse<{ status: string; room?: ApiRoom }>>('/users/accept', { targetUserId });
    const dataObj = res.data?.data;
    return {
      success: res.data?.success || false,
      message: res.data?.message || 'Connected successfully',
      status: 'connected',
      room: dataObj?.room || ('room' in (res.data || {}) ? (res.data as unknown as { room?: ApiRoom }).room : undefined),
    };
  },

  async rejectConnectionRequest(targetUserId: string): Promise<{ success: boolean; message: string }> {
    const res = await api.post<ApiResponse<void>>('/users/reject', { targetUserId });
    return {
      success: res.data?.success || false,
      message: res.data?.message || 'Connection request removed',
    };
  },

  async getConnections(): Promise<ConnectionsData> {
    try {
      const res = await api.get<ApiResponse<ConnectionsData>>('/users/connections');
      return res.data?.data || { contacts: [], pendingIncoming: [], pendingOutgoing: [] };
    } catch (err) {
      console.warn('Failed to fetch connections:', err);
      return { contacts: [], pendingIncoming: [], pendingOutgoing: [] };
    }
  },

  async getStatuses(): Promise<StatusFeedResponse> {
    try {
      const res = await api.get<ApiResponse<StatusFeedResponse>>('/status');
      return res.data?.data || { myStatus: null, recentUpdates: [], viewedUpdates: [], totalActive: 0 };
    } catch (err) {
      console.warn('Failed to fetch statuses feed:', err);
      return { myStatus: null, recentUpdates: [], viewedUpdates: [], totalActive: 0 };
    }
  },

  async createStatus(data: { file?: File | Blob | null; caption?: string; mediaType?: string; backgroundColor?: string; fontStyle?: string }): Promise<ApiStoryItem> {
    if (data.file) {
      const formData = new FormData();
      formData.append('media', data.file);
      if (data.caption) formData.append('caption', data.caption);
      if (data.mediaType) formData.append('mediaType', data.mediaType);
      if (data.backgroundColor) formData.append('backgroundColor', data.backgroundColor);
      if (data.fontStyle) formData.append('fontStyle', data.fontStyle);

      const res = await api.post<ApiResponse<ApiStoryItem>>('/status', formData);
      return res.data.data;
    }

    const res = await api.post<ApiResponse<ApiStoryItem>>('/status', {
      caption: data.caption || '',
      mediaType: data.mediaType || 'text',
      backgroundColor: data.backgroundColor || '#12151b',
      fontStyle: data.fontStyle || 'sans-serif',
    });
    return res.data.data;
  },

  async deleteStatus(statusId: string): Promise<void> {
    await api.delete(`/status/${statusId}`);
  },

  async viewStatus(statusId: string): Promise<void> {
    try {
      await api.post(`/status/${statusId}/view`);
    } catch {
    }
  },

  async replyToStatus(statusId: string, replyText: string): Promise<{ message: ApiMessage; roomId: string; storyOwnerId: string }> {
    const res = await api.post<ApiResponse<{ message: ApiMessage; roomId: string; storyOwnerId: string }>>(`/status/${statusId}/reply`, {
      replyText,
    });
    return res.data.data;
  },
  async getCallLogs(): Promise<ApiCallLog[]> {
    try {
      const res = await api.get<ApiResponse<ApiCallLog[]>>('/calls');
      return res.data?.data || [];
    } catch {
      return [];
    }
  },

  async deleteCallLog(callRecordId: string): Promise<void> {
    await api.delete(`/calls/${callRecordId}`);
  },

  async clearCallLogs(): Promise<void> {
    await api.delete('/calls');
  },
};

export interface ApiCallLog {
  id: string;
  callId: string;
  name: string;
  avatar: string;
  type: 'audio' | 'video';
  direction: 'incoming' | 'outgoing' | 'missed';
  status: 'completed' | 'missed';
  rawStatus?: string;
  duration: string;
  durationSeconds?: number;
  time: string;
  createdAt?: string;
  otherUserId?: string;
}

export interface ApiStoryItem {
  id: string;
  mediaUrl?: string;
  mediaType: 'image' | 'video' | 'text';
  caption?: string;
  backgroundColor?: string;
  fontStyle?: string;
  createdAt: string;
  expiresAt: string;
  time: string;
  timeAgo: string;
  viewedByMe?: boolean;
  viewersCount?: number;
  viewers?: Array<{ id: string; name: string; avatar?: string; viewedAt?: string }>;
}

export interface ApiUserStatusGroup {
  userId: string;
  userName: string;
  userFullName: string;
  avatar?: string;
  isMe?: boolean;
  stories: ApiStoryItem[];
  allViewed?: boolean;
  lastUpdated?: string;
}

export interface StatusFeedResponse {
  myStatus: ApiUserStatusGroup | null;
  recentUpdates: ApiUserStatusGroup[];
  viewedUpdates: ApiUserStatusGroup[];
  totalActive: number;
}

export default chatApi;

