import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChatMessage, Reaction } from '../UI/ChatArea';
import { chatApi, ApiMessage } from '../api/chatApi';
import { socketService } from '../api/socketService';
import { authService } from '../../auth/api/authService';
import { chatStorage } from '../api/chatStorage';

export interface UseMessageOptions {
  roomId?: string;
  autoFetch?: boolean;
  limit?: number;
}

export interface UseMessageReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  fetchMessages: (targetRoomId?: string, limit?: number, page?: number) => Promise<ChatMessage[]>;
  sendMessage: (text: string, type?: ChatMessage['type'], meta?: Record<string, unknown>, targetRoomId?: string) => Promise<ChatMessage | null>;
  editMessage: (messageId: string, newText: string, targetRoomId?: string) => Promise<boolean>;
  deleteMessage: (messageId: string, targetRoomId?: string) => Promise<boolean>;
  addReaction: (messageId: string, emoji: string, targetRoomId?: string) => void;
  clearError: () => void;
}

const mapApiMessageToChatMessage = (m: ApiMessage, currentUserId: string): ChatMessage => {
  const senderId = typeof m.userId === 'object' && m.userId !== null ? m.userId._id : m.userId;
  const senderName = typeof m.userId === 'object' && m.userId !== null ? m.userId.name : 'User';
  const senderAvatar = typeof m.userId === 'object' && m.userId !== null ? m.userId.avatar : undefined;
  const isMe = Boolean(currentUserId && senderId === currentUserId);

  return {
    id: m._id,
    sender: isMe ? 'me' : 'other',
    senderName: isMe ? 'You' : senderName,
    avatar: senderAvatar,
    type: 'text',
    text: m.text,
    time: new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    status: 'read',
  };
};

export function useMessage(options?: string | UseMessageOptions): UseMessageReturn {
  const resolvedOptions = useMemo<UseMessageOptions>(() => {
    if (typeof options === 'string') {
      return { roomId: options, autoFetch: true };
    }
    return { autoFetch: true, ...options };
  }, [options]);

  const { roomId, autoFetch = true, limit = 50 } = resolvedOptions;

  const currentUser = useMemo(() => authService.getStoredUser(), []);
  const currentUserId = currentUser?.id || currentUser?._id || '';

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (roomId) {
      return chatStorage.getRoomMessages(roomId);
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // Fetch messages from REST API and sync via Socket.IO
  const fetchMessages = useCallback(
    async (targetRoomId?: string, customLimit?: number, page: number = 1): Promise<ChatMessage[]> => {
      const activeRoom = targetRoomId || roomId;
      if (!activeRoom) return [];

      setIsLoading(true);
      setError(null);

      try {
        const fetchLimit = customLimit || limit;
        const backendMsgs = await chatApi.getMessages({ roomId: activeRoom, limit: fetchLimit, page });
        
        if (Array.isArray(backendMsgs) && backendMsgs.length > 0) {
          const mapped = backendMsgs.map((m) => mapApiMessageToChatMessage(m, currentUserId));
          
          setMessages((_prev) => {
            const local = chatStorage.getRoomMessages(activeRoom);
            const combined = [...local, ...mapped];
            const unique = Array.from(new Map(combined.map((msg) => [msg.id, msg])).values());
            chatStorage.saveRoomMessages(activeRoom, unique);
            return unique;
          });

          // Also request live list from socket
          socketService.getMessages(activeRoom, fetchLimit, page);
          setIsLoading(false);
          return mapped;
        }

        // If backend returned empty, fallback to local storage
        const local = chatStorage.getRoomMessages(activeRoom);
        setMessages(local);
        socketService.getMessages(activeRoom, fetchLimit, page);
        setIsLoading(false);
        return local;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to fetch messages';
        setError(msg);
        setIsLoading(false);
        return chatStorage.getRoomMessages(activeRoom);
      }
    },
    [roomId, limit, currentUserId]
  );

  // Auto fetch when roomId changes
  useEffect(() => {
    if (!roomId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessages([]);
      return;
    }

    setMessages(chatStorage.getRoomMessages(roomId));

    if (autoFetch) {
      fetchMessages(roomId);
    }
  }, [roomId, autoFetch, fetchMessages]);

  // Send message
  const sendMessage = useCallback(
    async (
      text: string,
      type: ChatMessage['type'] = 'text',
      meta: Record<string, unknown> = {},
      targetRoomId?: string
    ): Promise<ChatMessage | null> => {
      const activeRoom = targetRoomId || roomId;
      const cleanText = text.trim();
      if (!cleanText || !activeRoom) return null;

      const now = new Date();
      const hours = String(now.getHours() % 12 || 12).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
      const currentTime = `${hours}:${minutes} ${ampm}`;

      const tempId = `msg-${Date.now()}`;
      const optimisticMsg: ChatMessage = {
        id: tempId,
        sender: 'me',
        senderName: 'You',
        type,
        text: cleanText,
        time: currentTime,
        status: 'read',
        ...meta,
      };

      // 1. Optimistic local update
      setMessages((prev) => {
        const updated = [...prev, optimisticMsg];
        chatStorage.saveRoomMessages(activeRoom, updated);
        return updated;
      });

      // 2. Broadcast via Socket.IO
      socketService.sendMessage(activeRoom, cleanText);

      // 3. Persist via REST API
      try {
        const created = await chatApi.createMessage({
          roomId: activeRoom,
          text: cleanText,
          userId: currentUserId || undefined,
        });

        if (created && created._id) {
          const finalMsg: ChatMessage = {
            ...optimisticMsg,
            id: created._id,
          };

          setMessages((prev) => {
            const updated = prev.map((m) => (m.id === tempId ? finalMsg : m));
            chatStorage.saveRoomMessages(activeRoom, updated);
            return updated;
          });

          return finalMsg;
        }
      } catch (err) {
        console.warn('REST message persistence failed, relying on socket & local storage:', err);
      }

      return optimisticMsg;
    },
    [roomId, currentUserId]
  );

  // Edit message
  const editMessage = useCallback(
    async (messageId: string, newText: string, targetRoomId?: string): Promise<boolean> => {
      const activeRoom = targetRoomId || roomId;
      const cleanText = newText.trim();
      if (!messageId || !cleanText) return false;

      // 1. Optimistic local update
      setMessages((prev) => {
        const updated = prev.map((m) => (m.id === messageId ? { ...m, text: cleanText } : m));
        if (activeRoom) {
          chatStorage.saveRoomMessages(activeRoom, updated);
        }
        return updated;
      });

      // 2. Socket emission
      socketService.editMessage(messageId, cleanText);

      // 3. REST update
      try {
        await chatApi.updateMessage(messageId, cleanText);
        return true;
      } catch (err) {
        console.warn('REST message update failed:', err);
        return false;
      }
    },
    [roomId]
  );

  // Delete message
  const deleteMessage = useCallback(
    async (messageId: string, targetRoomId?: string): Promise<boolean> => {
      const activeRoom = targetRoomId || roomId;
      if (!messageId) return false;

      // 1. Optimistic local removal
      setMessages((prev) => {
        const updated = prev.filter((m) => m.id !== messageId);
        if (activeRoom) {
          chatStorage.saveRoomMessages(activeRoom, updated);
        }
        return updated;
      });

      // 2. Socket emission
      socketService.deleteMessage(messageId);

      // 3. REST delete
      try {
        await chatApi.deleteMessage(messageId);
        return true;
      } catch (err) {
        console.warn('REST message delete failed:', err);
        return false;
      }
    },
    [roomId]
  );

  // Add reaction
  const addReaction = useCallback(
    (messageId: string, emoji: string, targetRoomId?: string) => {
      const activeRoom = targetRoomId || roomId;
      setMessages((prev) => {
        const updated = prev.map((msg) => {
          if (msg.id !== messageId) return msg;
          const reactions = msg.reactions || [];
          const existingIdx = reactions.findIndex((r) => r.emoji === emoji);

          let nextReactions: Reaction[];
          if (existingIdx > -1) {
            nextReactions = reactions.map((r, i) => {
              if (i === existingIdx) {
                const nextCount = r.reacted ? r.count - 1 : r.count + 1;
                return { ...r, count: Math.max(0, nextCount), reacted: !r.reacted };
              }
              return r;
            }).filter((r) => r.count > 0);
          } else {
            nextReactions = [...reactions, { emoji, count: 1, reacted: true }];
          }

          return { ...msg, reactions: nextReactions };
        });

        if (activeRoom) {
          chatStorage.saveRoomMessages(activeRoom, updated);
        }
        return updated;
      });
    },
    [roomId]
  );

  // Real-time socket listeners
  useEffect(() => {
    const unbindReceive = socketService.on('receiveMessage', (data: unknown) => {
      if (data && typeof data === 'object') {
        const text = 'text' in data && typeof data.text === 'string' ? data.text : '';
        const msgRoomId = 'roomId' in data && typeof data.roomId === 'string' ? data.roomId : '';
        const msgId = '_id' in data && typeof data._id === 'string' ? data._id : `msg-${Date.now()}`;
        const rawUser = 'userId' in data ? data.userId : null;
        const senderId = rawUser && typeof rawUser === 'object' && '_id' in rawUser ? String(rawUser._id) : String(rawUser || '');
        const senderName = rawUser && typeof rawUser === 'object' && 'name' in rawUser ? String(rawUser.name) : 'User';
        const isMe = Boolean(currentUserId && senderId === currentUserId);

        if (text && (!roomId || roomId === msgRoomId)) {
          const now = new Date();
          const hours = String(now.getHours() % 12 || 12).padStart(2, '0');
          const minutes = String(now.getMinutes()).padStart(2, '0');
          const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
          const currentTime = `${hours}:${minutes} ${ampm}`;

          const incomingMsg: ChatMessage = {
            id: msgId,
            sender: isMe ? 'me' : 'other',
            senderName: isMe ? 'You' : senderName,
            type: 'text',
            text,
            time: currentTime,
            status: 'read',
          };

          setMessages((prev) => {
            if (prev.some((m) => m.id === msgId)) return prev;
            const updated = [...prev, incomingMsg];
            if (msgRoomId) {
              chatStorage.saveRoomMessages(msgRoomId, updated);
            }
            return updated;
          });
        }
      }
    });

    const unbindList = socketService.on('messages:list', (data: unknown) => {
      if (data && typeof data === 'object' && 'messages' in data) {
        const msgRoomId = 'roomId' in data ? String(data.roomId) : '';
        if (!roomId || roomId === msgRoomId) {
          const rawMsgs = Array.isArray(data.messages) ? data.messages : [];
          if (rawMsgs.length > 0) {
            const mapped = rawMsgs.map((m: ApiMessage) => mapApiMessageToChatMessage(m, currentUserId));
            setMessages((prev) => {
              const combined = [...prev, ...mapped];
              const unique = Array.from(new Map(combined.map((m) => [m.id, m])).values());
              if (msgRoomId) {
                chatStorage.saveRoomMessages(msgRoomId, unique);
              }
              return unique;
            });
          }
        }
      }
    });

    const unbindUpdated = socketService.on('messageUpdated', (data: unknown) => {
      if (data && typeof data === 'object' && '_id' in data && 'text' in data) {
        const msgId = String(data._id);
        const newText = String(data.text);
        const msgRoomId = 'roomId' in data ? String(data.roomId) : '';

        if (!roomId || roomId === msgRoomId) {
          setMessages((prev) => {
            const updated = prev.map((m) => (m.id === msgId ? { ...m, text: newText } : m));
            if (msgRoomId) {
              chatStorage.saveRoomMessages(msgRoomId, updated);
            }
            return updated;
          });
        }
      }
    });

    const unbindDeleted = socketService.on('messageDeleted', (data: unknown) => {
      if (data && typeof data === 'object' && 'messageId' in data) {
        const messageId = String(data.messageId);
        const msgRoomId = 'roomId' in data ? String(data.roomId) : '';

        if (!roomId || roomId === msgRoomId) {
          setMessages((prev) => {
            const updated = prev.filter((m) => m.id !== messageId);
            if (msgRoomId) {
              chatStorage.saveRoomMessages(msgRoomId, updated);
            }
            return updated;
          });
        }
      }
    });

    const unbindError = socketService.on('message:error', (data: unknown) => {
      if (data && typeof data === 'object' && 'message' in data) {
        setError(String(data.message));
      }
    });

    return () => {
      unbindReceive();
      unbindList();
      unbindUpdated();
      unbindDeleted();
      unbindError();
    };
  }, [roomId, currentUserId]);

  return {
    messages,
    isLoading,
    error,
    fetchMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    clearError,
  };
}

export default useMessage;
