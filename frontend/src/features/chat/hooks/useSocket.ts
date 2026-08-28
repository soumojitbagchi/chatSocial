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
  const [isConnected, setIsConnected] = useState<boolean>(() => socketService.isConnected());
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!user || !token) {
      socketService.disconnect();
      setIsConnected(false);
      return;
    }

    socketService.connect();
    setIsConnected(socketService.isConnected());

    const unbindConnect = socketService.on('connect', () => {
      setIsConnected(true);
    });

    const unbindDisconnect = socketService.on('disconnect', () => {
      setIsConnected(false);
    });

    const unbindOnlineList = socketService.on('users:online-list', (data: unknown) => {
      if (Array.isArray(data)) {
        const ids = data.filter((item): item is string => typeof item === 'string');
        setOnlineUsers(ids);
      }
    });

    const unbindUserOnline = socketService.on('user:online', (data: unknown) => {
      if (data && typeof data === 'object' && 'userId' in data) {
        const val = data.userId;
        if (typeof val === 'string') {
          setOnlineUsers((prev) => Array.from(new Set([...prev, val])));
        }
      }
    });

    const unbindUserOffline = socketService.on('user:offline', (data: unknown) => {
      if (data && typeof data === 'object' && 'userId' in data) {
        const val = data.userId;
        if (typeof val === 'string') {
          setOnlineUsers((prev) => prev.filter((id) => id !== val));
        }
      }
    });

    return () => {
      unbindConnect();
      unbindDisconnect();
      unbindOnlineList();
      unbindUserOnline();
      unbindUserOffline();
    };
  }, [user, token]);

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
