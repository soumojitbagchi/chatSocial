import { useState, useEffect, useCallback } from 'react';
import { socketService, SocketEventCallback } from '../api/socketService';
import { useAuthContext } from '../../auth/hooks/useAuthContext';

export interface UseSocketReturn {
  isConnected: boolean;
  onlineUsers: string[];
  sendMessage: (roomId: string, text: string) => void;
  editMessage: (messageId: string, newMessage: string) => void;
  deleteMessage: (messageId: string) => void;
  getMessages: (roomId: string, limit?: number, page?: number) => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  switchRoom: (oldRoomId: string, newRoomId: string) => void;
  createRoom: (roomname: string, description?: string) => void;
  emit: (event: string, data: unknown) => void;
  on: (event: string, callback: SocketEventCallback) => () => void;
}

export function useSocket(): UseSocketReturn {
  const { user, token } = useAuthContext();
  const userId = user?.id || user?._id || '';
  const username = user?.username || user?.name || '';
  const [isConnected, setIsConnected] = useState<boolean>(() => socketService.isConnected());
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  const normalizeIdList = (data: unknown): string[] | null => {
    const toIds = (arr: unknown): string[] =>
      Array.isArray(arr)
        ? arr
          .map((item) => {
            if (typeof item === 'string') return item;
            if (item && typeof item === 'object') {
              const obj = item as Record<string, unknown>;
              const raw = obj.userId ?? obj.id ?? obj._id;
              return typeof raw === 'string' ? raw : String(raw ?? '');
            }
            return '';
          })
          .map((id) => String(id || '').trim())
          .filter(Boolean)
        : [];
    if (Array.isArray(data)) return Array.from(new Set(toIds(data)));
    if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      for (const key of ['users', 'onlineUsers', 'online', 'data', 'userIds']) {
        if (Array.isArray(obj[key])) return Array.from(new Set(toIds(obj[key])));
      }
    }
    return null;
  };

  const extractSingleUserId = (data: unknown): string | null => {
    if (typeof data === 'string') return data.trim() || null;
    if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      const raw = obj.userId ?? obj.id ?? obj._id ?? obj.user;
      if (typeof raw === 'string' && raw.trim()) return raw.trim();
      if (raw && typeof raw === 'object') {
        const nested = (raw as Record<string, unknown>).userId ?? (raw as Record<string, unknown>).id;
        if (typeof nested === 'string' && nested.trim()) return nested.trim();
      }
    }
    return null;
  };

  useEffect(() => {
    if (!userId || !token) {
      socketService.disconnect();
      return;
    }

    socketService.connect(undefined, { token, userId, username });

    const syncPresence = () => {
      socketService.emit('online', { userId });
      socketService.emit('getOnlineUsers', {});
      socketService.emit('presence:sync', {});
    };
    if (socketService.isConnected()) {
      setIsConnected(true);
      syncPresence();
    }

    const unbindConnect = socketService.on('connect', () => {
      setIsConnected(true);
      syncPresence();
    });

    const unbindDisconnect = socketService.on('disconnect', () => {
      setIsConnected(false);
    });
    const PRESENCE_HEARTBEAT_MS = 5000;
    const heartbeat = setInterval(() => {
      if (socketService.isConnected()) {
        socketService.emit('online', { userId });
        socketService.emit('getOnlineUsers', {});
        socketService.emit('presence:sync', {});
      }
    }, PRESENCE_HEARTBEAT_MS);

    const resyncIfVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      if (socketService.isConnected()) syncPresence();
    };
    const handleOnlineEvent = () => {
      if (socketService.isConnected()) syncPresence();
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', resyncIfVisible);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', resyncIfVisible);
      window.addEventListener('online', handleOnlineEvent);
    }

    const unbindOnlineList = socketService.on('users:online-list', (data: unknown) => {
      const ids = normalizeIdList(data);
      if (ids) setOnlineUsers(ids);
    });
    const unbindUserOnline = socketService.on('user:online', (data: unknown) => {
      const id = extractSingleUserId(data);
      if (id) {
        setOnlineUsers((prev) => Array.from(new Set([...prev.map(String), String(id)])));
      }
    });

    const unbindUserOffline = socketService.on('user:offline', (data: unknown) => {
      const id = extractSingleUserId(data);
      if (id) {
        setOnlineUsers((prev) => prev.map(String).filter((existing) => existing !== String(id)));
      }
    });

    return () => {
      clearInterval(heartbeat);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', resyncIfVisible);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', resyncIfVisible);
        window.removeEventListener('online', handleOnlineEvent);
      }
      unbindConnect();
      unbindDisconnect();
      unbindOnlineList();
      unbindUserOnline();
      unbindUserOffline();
    };
  }, [userId, token, username]);

  const sendMessage = useCallback((roomId: string, text: string) => {
    socketService.sendMessage(roomId, text);
  }, []);

  const editMessage = useCallback((messageId: string, newMessage: string) => {
    socketService.editMessage(messageId, newMessage);
  }, []);

  const deleteMessage = useCallback((messageId: string) => {
    socketService.deleteMessage(messageId);
  }, []);

  const getMessages = useCallback((roomId: string, limit: number = 50, page: number = 1) => {
    socketService.getMessages(roomId, limit, page);
  }, []);

  const joinRoom = useCallback((roomId: string) => {
    socketService.joinRoom(roomId);
  }, []);

  const leaveRoom = useCallback((roomId: string) => {
    socketService.leaveRoom(roomId);
  }, []);

  const switchRoom = useCallback((oldRoomId: string, newRoomId: string) => {
    socketService.switchRoom(oldRoomId, newRoomId);
  }, []);

  const createRoom = useCallback((roomname: string, description?: string) => {
    socketService.createRoom(roomname, description || '');
  }, []);

  const emit = useCallback((event: string, data: unknown) => {
    socketService.emit(event, data);
  }, []);

  const on = useCallback((event: string, callback: SocketEventCallback) => {
    return socketService.on(event, callback);
  }, []);

  return {
    isConnected,
    onlineUsers,
    sendMessage,
    editMessage,
    deleteMessage,
    getMessages,
    joinRoom,
    leaveRoom,
    switchRoom,
    createRoom,
    emit,
    on,
  };
}

export default useSocket;
