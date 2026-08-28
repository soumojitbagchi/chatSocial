import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChatItem, RecentChatUser } from '../UI/ChatList';
import { ChatMessage } from '../UI/ChatArea';
import { chatApi, ApiMessage, ApiRoom } from '../api/chatApi';
import { socketService } from '../api/socketService';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import { chatStorage } from '../api/chatStorage';

export interface UseChatReturn {
  chats: ChatItem[];
  recentChats: RecentChatUser[];
  activeChatId: string;
  activeChat: ChatItem | null;
  messages: Record<string, ChatMessage[]>;
  activeMessages: ChatMessage[];
  searchQuery: string;
  isLoading: boolean;
  setSearchQuery: (q: string) => void;
  selectChat: (id: string) => void;
  sendMessage: (text: string, type?: string, meta?: Record<string, unknown>) => Promise<void>;
  editMessage: (messageId: string, text: string) => Promise<void>;
  createNewContact: (name: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  addReaction: (messageId: string, emoji: string) => void;
  loadBackendMessages: (roomId: string) => Promise<void>;
  fetchBackendRooms: () => Promise<void>;
}

export function useChat(): UseChatReturn {
  // Initialize from persistent storage so refresh NEVER loses messages or rooms
  const [chats, setChats] = useState<ChatItem[]>(() => chatStorage.getChats());
  const [recentChats, setRecentChats] = useState<RecentChatUser[]>(() => chatStorage.getRecent());
  const [activeChatId, setActiveChatId] = useState<string>(() => chatStorage.getActiveRoomId());
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading] = useState(false);

  const { user: authUser } = useAuthContext();
  const currentUserId = authUser?.id || authUser?._id || '';

  const activeChatIdRef = useRef<string>(activeChatId);
  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  const activeChat = useMemo(() => {
    return chats.find((c) => c.id === activeChatId) || chats[0] || null;
  }, [chats, activeChatId]);

  const activeMessages = useMemo(() => {
    return messages[activeChatId] || chatStorage.getRoomMessages(activeChatId) || [];
  }, [messages, activeChatId]);

  // Load messages from backend API & merge with local storage
  const loadBackendMessages = useCallback(async (roomId: string) => {
    if (!roomId) return;
    try {
      const backendMsgs = await chatApi.getMessages({ roomId });
      if (backendMsgs && Array.isArray(backendMsgs) && backendMsgs.length > 0) {
        const mappedMsgs: ChatMessage[] = backendMsgs.map((m: ApiMessage) => {
          const senderId = typeof m.userId === 'object' ? m.userId?._id : m.userId;
          const senderName = typeof m.userId === 'object' ? m.userId?.name : 'User';
          const isMe = Boolean(currentUserId && senderId === currentUserId);

          return {
            id: m._id,
            sender: isMe ? 'me' : 'other',
            senderName: isMe ? 'You' : senderName,
            type: 'text',
            text: m.text,
            time: new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'read'
          };
        });

        setMessages((prev) => {
          const localSaved = chatStorage.getRoomMessages(roomId);
          const combined = [...localSaved, ...mappedMsgs];
          const unique = Array.from(new Map(combined.map((msg) => [msg.id, msg])).values());
          chatStorage.saveRoomMessages(roomId, unique);
          return {
            ...prev,
            [roomId]: unique
          };
        });
      }
    } catch (err) {
      console.warn(`Could not fetch remote messages for room ${roomId}, using persistent storage.`, err);
    }
  }, [currentUserId]);

  // Fetch real rooms from backend API
  const fetchBackendRooms = useCallback(async () => {
    try {
      const backendRooms = await chatApi.getRooms();
      if (backendRooms && Array.isArray(backendRooms) && backendRooms.length > 0) {
        const mappedChats: ChatItem[] = backendRooms.map((r: ApiRoom) => ({
          id: r._id,
          name: r.roomname,
          initials: r.roomname.slice(0, 2).toUpperCase(),
          avatarBg: '#6f7771',
          lastMessage: r.description || 'No messages yet',
          time: new Date(r.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          unread: 0,
          online: true,
          statusText: r.description || 'Public Room'
        }));

        setChats((prev) => {
          const combined = [...mappedChats, ...prev];
          const unique = Array.from(new Map(combined.map((item) => [item.id, item])).values());
          chatStorage.saveChats(unique);
          return unique;
        });

        const recents: RecentChatUser[] = backendRooms.slice(0, 6).map((r: ApiRoom) => ({
          id: `recent-${r._id}`,
          name: r.roomname,
          fullName: r.roomname,
          initials: r.roomname.slice(0, 2).toUpperCase(),
          avatarBg: '#6f7771',
          online: true,
          chatId: r._id
        }));

        setRecentChats(recents);
        chatStorage.saveRecent(recents);

        setActiveChatId((prev) => {
          const targetId = prev || backendRooms[0]._id;
          chatStorage.saveActiveRoomId(targetId);
          socketService.joinRoom(targetId);
          return targetId;
        });
      }
    } catch (err) {
      console.warn('Could not fetch backend rooms, using local persistent storage.', err);
    }
  }, []);

  // Initial fetch on mount & whenever user is authenticated
  useEffect(() => {
    if (!currentUserId) return;
    let isSubscribed = true;

    chatApi.getRooms().then((backendRooms) => {
      if (!isSubscribed || !backendRooms || !Array.isArray(backendRooms) || backendRooms.length === 0) return;
      const mappedChats: ChatItem[] = backendRooms.map((r: ApiRoom, index: number) => ({
        id: r._id,
        name: r.roomname,
        initials: r.roomname.slice(0, 2).toUpperCase(),
        avatarBg: ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6'][index % 5],
        lastMessage: r.description || 'No messages yet',
        time: new Date(r.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        unread: 0,
        online: true,
        statusText: r.description || 'Public Room'
      }));

      setChats((prev) => {
        const combined = [...mappedChats, ...prev];
        const unique = Array.from(new Map(combined.map((item) => [item.id, item])).values());
        chatStorage.saveChats(unique);
        return unique;
      });

      const recents: RecentChatUser[] = backendRooms.slice(0, 6).map((r: ApiRoom, index: number) => ({
        id: `recent-${r._id}`,
        name: r.roomname,
        fullName: r.roomname,
        initials: r.roomname.slice(0, 2).toUpperCase(),
        avatarBg: ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6'][index % 5],
        online: true,
        chatId: r._id
      }));
      setRecentChats(recents);
      chatStorage.saveRecent(recents);

      setActiveChatId((prev) => {
        if (!prev) {
          const firstId = backendRooms[0]._id;
          chatStorage.saveActiveRoomId(firstId);
          socketService.joinRoom(firstId);
          return firstId;
        }
        return prev;
      });
    }).catch(() => {});

    // Listen for room creation from any user over Socket.IO
    const unbindRoomCreated = socketService.on('room:created', (data: unknown) => {
      if (!isSubscribed) return;
      if (data && typeof data === 'object' && 'roomId' in data && 'roomname' in data) {
        const roomId = String(data.roomId);
        const roomname = String(data.roomname);
        const description = 'description' in data && typeof data.description === 'string' ? data.description : '';

        const newChat: ChatItem = {
          id: roomId,
          name: roomname,
          initials: roomname.slice(0, 2).toUpperCase(),
          avatarBg: '#6f7771',
          lastMessage: description || 'New room created',
          time: 'Just now',
          unread: 0,
          online: true,
          statusText: description
        };

        setChats((prev) => {
          if (prev.some((c) => c.id === roomId)) return prev;
          const updated = [newChat, ...prev];
          chatStorage.saveChats(updated);
          return updated;
        });
      }
    });

    return () => {
      isSubscribed = false;
      unbindRoomCreated();
    };
  }, [currentUserId, fetchBackendRooms]);

  // Load messages whenever activeChatId changes
  useEffect(() => {
    if (!activeChatId) return;
    let isSubscribed = true;

    chatApi.getMessages({ roomId: activeChatId }).then((backendMsgs) => {
      if (!isSubscribed || !backendMsgs || !Array.isArray(backendMsgs) || backendMsgs.length === 0) return;
      const mappedMsgs: ChatMessage[] = backendMsgs.map((m: ApiMessage) => {
        const senderId = typeof m.userId === 'object' ? m.userId?._id : m.userId;
        const senderName = typeof m.userId === 'object' ? m.userId?.name : 'User';
        const isMe = Boolean(currentUserId && senderId === currentUserId);

        return {
          id: m._id,
          sender: isMe ? 'me' : 'other',
          senderName: isMe ? 'You' : senderName,
          type: 'text',
          text: m.text,
          time: new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'read'
        };
      });

      setMessages((prev) => {
        const localSaved = chatStorage.getRoomMessages(activeChatId);
        const combined = [...localSaved, ...mappedMsgs];
        const unique = Array.from(new Map(combined.map((msg) => [msg.id, msg])).values());
        chatStorage.saveRoomMessages(activeChatId, unique);
        return {
          ...prev,
          [activeChatId]: unique
        };
      });
    }).catch(() => {});

    return () => {
      isSubscribed = false;
    };
  }, [activeChatId, currentUserId]);
  // Listen for real-time socket messages
  useEffect(() => {
    const unbindReceive = socketService.on('receiveMessage', (data: unknown) => {
      if (data && typeof data === 'object') {
        const text = 'text' in data && typeof data.text === 'string' ? data.text : '';
        const roomId = 'roomId' in data && typeof data.roomId === 'string' ? data.roomId : '';
        const msgId = '_id' in data && typeof data._id === 'string' ? data._id : `msg-${Date.now()}`;
        const rawUser = 'userId' in data ? data.userId : null;
        const senderId = rawUser && typeof rawUser === 'object' && '_id' in rawUser ? String(rawUser._id) : String(rawUser || '');
        const senderName = rawUser && typeof rawUser === 'object' && 'name' in rawUser ? String(rawUser.name) : 'User';

        const isMe = Boolean(currentUserId && senderId === currentUserId);
        if (roomId && text) {
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
            status: 'read'
          };

          setMessages((prev) => {
            const existing = prev[roomId] || chatStorage.getRoomMessages(roomId) || [];
            if (existing.some((m) => m.id === msgId)) {
              return prev;
            }
            const updated = [...existing, incomingMsg];
            chatStorage.saveRoomMessages(roomId, updated);
            return {
              ...prev,
              [roomId]: updated
            };
          });

          setChats((prevChats) => {
            const updated = prevChats.map((c) => {
              if (c.id === roomId) {
                return {
                  ...c,
                  lastMessage: text,
                  time: currentTime,
                  unread: c.id === activeChatIdRef.current ? 0 : (c.unread || 0) + 1
                };
              }
              return c;
            });
            chatStorage.saveChats(updated);
            return updated;
          });
        }
      }
    });

    const unbindList = socketService.on('messages:list', (data: unknown) => {
      if (data && typeof data === 'object' && 'roomId' in data && 'messages' in data) {
        const roomId = String(data.roomId);
        const msgs = Array.isArray(data.messages) ? data.messages : [];
        if (msgs.length > 0) {
          const mappedMsgs: ChatMessage[] = msgs.map((m: ApiMessage) => {
            const senderId = typeof m.userId === 'object' ? m.userId?._id : m.userId;
            const senderName = typeof m.userId === 'object' ? m.userId?.name : 'User';
            const isMe = Boolean(currentUserId && senderId === currentUserId);

            return {
              id: m._id,
              sender: isMe ? 'me' : 'other',
              senderName: isMe ? 'You' : senderName,
              type: 'text',
              text: m.text,
              time: new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              status: 'read'
            };
          });

          setMessages((prev) => {
            const localSaved = chatStorage.getRoomMessages(roomId);
            const combined = [...localSaved, ...mappedMsgs];
            const unique = Array.from(new Map(combined.map((m) => [m.id, m])).values());
            chatStorage.saveRoomMessages(roomId, unique);
            return {
              ...prev,
              [roomId]: unique
            };
          });
        }
      }
    });

    const unbindUpdated = socketService.on('messageUpdated', (data: unknown) => {
      if (data && typeof data === 'object' && '_id' in data && 'text' in data && 'roomId' in data) {
        const msgId = String(data._id);
        const roomId = String(data.roomId);
        const newText = String(data.text);
        setMessages((prev) => {
          const updated = (prev[roomId] || []).map((m) => (m.id === msgId ? { ...m, text: newText } : m));
          chatStorage.saveRoomMessages(roomId, updated);
          return {
            ...prev,
            [roomId]: updated
          };
        });
      }
    });

    const unbindDeleted = socketService.on('messageDeleted', (data: unknown) => {
      if (data && typeof data === 'object' && 'messageId' in data && 'roomId' in data) {
        const messageId = String(data.messageId);
        const roomId = String(data.roomId);
        setMessages((prev) => {
          const updated = (prev[roomId] || []).filter((m) => m.id !== messageId);
          chatStorage.saveRoomMessages(roomId, updated);
          return {
            ...prev,
            [roomId]: updated
          };
        });
      }
    });

    return () => {
      unbindReceive();
      unbindList();
      unbindUpdated();
      unbindDeleted();
    };
  }, [currentUserId]);
  // Select chat handler
  const selectChat = useCallback((id: string) => {
    setActiveChatId((prevOldId) => {
      chatStorage.saveActiveRoomId(id);
      if (prevOldId && prevOldId !== id) {
        socketService.switchRoom(prevOldId, id);
      } else {
        socketService.joinRoom(id);
      }
      return id;
    });

    // Request fresh messages from backend immediately
    loadBackendMessages(id);
    socketService.getMessages(id);

    // Clear unread on select
    setChats((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c));
      chatStorage.saveChats(updated);
      return updated;
    });
  }, [loadBackendMessages]);

  // Send message with instant local persistence, socket broadcast, and backend persistence
  const sendMessage = useCallback(async (text: string, type: string = 'text', meta: Record<string, unknown> = {}) => {
    if (!text.trim() || !activeChatId) return;

    const now = new Date();
    const hours = String(now.getHours() % 12 || 12).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
    const currentTime = `${hours}:${minutes} ${ampm}`;

    const tempId = `msg-${Date.now()}`;
    const newMsg: ChatMessage = {
      id: tempId,
      sender: 'me',
      senderName: 'You',
      type: (type as ChatMessage['type']) || 'text',
      text,
      time: currentTime,
      status: 'read',
      ...meta
    };

    // 1. Immediately persist message locally
    setMessages((prev) => {
      const existing = prev[activeChatId] || chatStorage.getRoomMessages(activeChatId) || [];
      const updated = [...existing, newMsg];
      chatStorage.saveRoomMessages(activeChatId, updated);
      return {
        ...prev,
        [activeChatId]: updated
      };
    });

    // 2. Emit over Socket.IO to backend
    socketService.sendMessage(activeChatId, text);

    // 3. Call REST endpoint and re-fetch to ensure complete sync
    try {
      await chatApi.createMessage({ roomId: activeChatId, text, userId: currentUserId });
    } catch {
      // Local persistent message remains active
    }
    // 4. Update chat list last message and persist
    const computedMediaType: ChatItem['mediaType'] = type === 'photo' ? 'photo' : type === 'document' ? 'document' : undefined;
    setChats((prevChats: ChatItem[]) => {
      const updated: ChatItem[] = prevChats.map((c) => {
        if (c.id === activeChatId) {
          return {
            ...c,
            lastMessage: type === 'document' ? String(meta.fileName || 'Document') : text,
            mediaType: computedMediaType,
            time: currentTime,
            unread: 0
          };
        }
        return c;
      });

      const currentChatIndex = updated.findIndex((c) => c.id === activeChatId);
      if (currentChatIndex > -1) {
        const [currentChat] = updated.splice(currentChatIndex, 1);
        const reordered = [currentChat, ...updated];
        chatStorage.saveChats(reordered);
        return reordered;
      }
      chatStorage.saveChats(updated);
      return updated;
    });
  }, [activeChatId, currentUserId]);

  // Edit message & re-fetch
  const editMessage = useCallback(async (messageId: string, text: string) => {
    setMessages((prev) => {
      const updated = (prev[activeChatId] || []).map((m) => (m.id === messageId ? { ...m, text } : m));
      chatStorage.saveRoomMessages(activeChatId, updated);
      return {
        ...prev,
        [activeChatId]: updated
      };
    });
    socketService.editMessage(messageId, text);
    try {
      await chatApi.updateMessage(messageId, { text });
    } catch {
      // Saved locally
    }
  }, [activeChatId]);

  // Create new contact or room on real backend & re-fetch
  const createNewContact = useCallback(async (name: string) => {
    const validId = generateValidObjectId();
    const cleanRoomName = name.trim();

    try {
      const createdRoom = await chatApi.createRoom({ roomname: cleanRoomName, description: 'Direct chat room' });
      const newId = createdRoom._id || validId;
      const newChat: ChatItem = {
        id: newId,
        name: createdRoom.roomname || cleanRoomName,
        initials: cleanRoomName.slice(0, 2).toUpperCase(),
        avatarBg: '#6f7771',
        lastMessage: 'Room created',
        time: 'Just now',
        unread: 0,
        online: true,
        statusText: createdRoom.description || 'Available'
      };

      setChats((prev) => {
        const updated = [newChat, ...prev.filter((c) => c.id !== newId)];
        chatStorage.saveChats(updated);
        return updated;
      });
      setActiveChatId(newId);
      chatStorage.saveActiveRoomId(newId);
      socketService.createRoom(cleanRoomName, 'Direct chat room');
      socketService.joinRoom(newId);

      // Re-fetch rooms from backend to guarantee complete sync
      await fetchBackendRooms();
    } catch {
      // Create locally persistent room with valid MongoDB ObjectId
      const newChat: ChatItem = {
        id: validId,
        name: cleanRoomName,
        initials: cleanRoomName.slice(0, 2).toUpperCase(),
        avatarBg: '#6f7771',
        lastMessage: 'Conversation started',
        time: 'Just now',
        unread: 0,
        online: true,
        statusText: 'Available'
      };
      setChats((prev) => {
        const updated = [newChat, ...prev];
        chatStorage.saveChats(updated);
        return updated;
      });
      setActiveChatId(validId);
      chatStorage.saveActiveRoomId(validId);
      socketService.createRoom(cleanRoomName, 'Direct chat room');
      socketService.joinRoom(validId);
    }
  }, [fetchBackendRooms]);

  // Delete message & re-fetch
  const deleteMessage = useCallback(async (messageId: string) => {
    setMessages((prev) => {
      const updated = (prev[activeChatId] || []).filter((m) => m.id !== messageId);
      chatStorage.saveRoomMessages(activeChatId, updated);
      return {
        ...prev,
        [activeChatId]: updated
      };
    });
    socketService.deleteMessage(messageId);
    try {
      await chatApi.deleteMessage(messageId);
      await loadBackendMessages(activeChatId);
    } catch {
      // Saved locally
    }
  }, [activeChatId, loadBackendMessages]);

  // Add reaction
  const addReaction = useCallback((messageId: string, emoji: string) => {
    setMessages((prev) => {
      const updated = (prev[activeChatId] || []).map((m) => {
        if (m.id === messageId) {
          const currentReactions = m.reactions || [];
          const existing = currentReactions.find((r) => r.emoji === emoji);
          let updatedReactions;
          if (existing) {
            updatedReactions = currentReactions.map((r) =>
              r.emoji === emoji ? { ...r, count: r.count + 1 } : r
            );
          } else {
            updatedReactions = [...currentReactions, { emoji, count: 1 }];
          }
          return { ...m, reactions: updatedReactions };
        }
        return m;
      });
      chatStorage.saveRoomMessages(activeChatId, updated);
      return {
        ...prev,
        [activeChatId]: updated
      };
    });
  }, [activeChatId]);

  return {
    chats,
    recentChats,
    activeChatId,
    activeChat,
    messages,
    activeMessages,
    searchQuery,
    isLoading,
    setSearchQuery,
    selectChat,
    sendMessage,
    editMessage,
    createNewContact,
    deleteMessage,
    addReaction,
    loadBackendMessages,
    fetchBackendRooms,
  };
}

export default useChat;
