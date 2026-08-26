import { useState, useEffect, useCallback } from 'react';
import { socketService, SocketEventCallback } from '../api/socketService';

export interface UseSocketReturn {
  isConnected: boolean;
  onlineUsers: string[];
  sendMessage: (roomId: string, text: string) => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  switchRoom: (oldRoomId: string, newRoomId: string) => void;
  createRoom: (roomname: string, description?: string) => void;
  on: (event: string, callback: SocketEventCallback) => () => void;
}

export function useSocket(): UseSocketReturn {
  const [isConnected, setIsConnected] = useState<boolean>(socketService.isConnected());
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  useEffect(() => {
    socketService.connect();

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
  }, []);

  const sendMessage = useCallback((roomId: string, text: string) => {
    socketService.sendMessage(roomId, text);
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

  const on = useCallback((event: string, callback: SocketEventCallback) => {
    return socketService.on(event, callback);
  }, []);

  return {
    isConnected,
    onlineUsers,
    sendMessage,
    joinRoom,
    leaveRoom,
    switchRoom,
    createRoom,
    on,
  };
}

export default useSocket;
