import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChatItem, RecentChatUser } from '../UI/ChatList';
import { ChatMessage } from '../UI/ChatArea';
import { chatApi, ApiMessage, ApiRoom } from '../api/chatApi';
import { socketService } from '../api/socketService';
import { authService } from '../../auth/api/authService';
import { chatStorage, generateValidObjectId } from '../api/chatStorage';

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
  deleteMessage: (messageId: string, deleteType?: 'forMe' | 'forEveryone') => Promise<void>;
  addReaction: (messageId: string, emoji: string) => void;
  loadBackendMessages: (roomId: string) => Promise<void>;
  fetchBackendRooms: () => Promise<void>;
}

const SUPPORTED_MESSAGE_TYPES = new Set<NonNullable<ChatMessage['type']>>([
  'text', 'audio', 'document', 'photo', 'video', 'gallery', 'date', 'call-log', 'story-reply',
]);

const readMetaString = (meta: Record<string, unknown>, ...keys: string[]) => {
  for (const key of keys) {
    const value = meta[key];
    if (typeof value === 'string' && value) return value;
  }
  return undefined;
};

const normalizeMessageType = (type?: string): NonNullable<ChatMessage['type']> => {
  if (type && SUPPORTED_MESSAGE_TYPES.has(type as NonNullable<ChatMessage['type']>)) {
    return type as NonNullable<ChatMessage['type']>;
  }
  return 'text';
};

const mapApiMessage = (message: ApiMessage, currentUserId: string, fallbackSenderName: string = 'User'): ChatMessage => {
  const rawUser = message.userId;
  const senderId = typeof rawUser === 'object' ? rawUser?._id : rawUser;
  const senderName = typeof rawUser === 'object' ? rawUser?.name : fallbackSenderName;
  const isMe = Boolean(currentUserId && senderId === currentUserId);
  const meta = message.meta && typeof message.meta === 'object' ? message.meta : {};
  const type = normalizeMessageType(message.type);
  const mediaUrl = readMetaString(meta, 'url', 'mediaUrl', 'fileUrl');
  const photoUrl = readMetaString(meta, 'photoUrl', 'imageUrl') || (type === 'photo' || type === 'video' ? mediaUrl : undefined);
  const imageUrl = readMetaString(meta, 'imageUrl', 'photoUrl') || (type === 'photo' || type === 'video' ? mediaUrl : undefined);
  const createdAt = new Date(message.createdAt || Date.now());

  return {
    id: message._id,
    sender: isMe ? 'me' : 'other',
    senderName: isMe ? 'You' : (senderName || fallbackSenderName),
    type,
    text: message.text,
    audioDuration: readMetaString(meta, 'audioDuration'),
    audioUrl: readMetaString(meta, 'audioUrl') || (type === 'audio' || type === 'document' ? mediaUrl : undefined),
    fileName: readMetaString(meta, 'fileName', 'name'),
    fileSize: readMetaString(meta, 'fileSize'),
    fileType: readMetaString(meta, 'fileType'),
    imageUrl,
    photoUrl,
    caption: readMetaString(meta, 'caption'),
    time: Number.isNaN(createdAt.getTime())
      ? ''
      : createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    status: 'read',
    meta,
  };
};

const getClientMessageId = (message: ChatMessage) => {
  const value = message.meta?.clientMessageId;
  return typeof value === 'string' && value ? value : undefined;
};

const mergeChatMessages = (existing: ChatMessage[], incoming: ChatMessage[]) => {
  const merged = [...existing];

  for (const message of incoming) {
    const clientMessageId = getClientMessageId(message);
    const existingIndex = merged.findIndex((candidate) => (
      candidate.id === message.id
      || Boolean(clientMessageId && (candidate.id === clientMessageId || getClientMessageId(candidate) === clientMessageId))
    ));

    if (existingIndex >= 0) merged[existingIndex] = message;
    else merged.push(message);
  }

  return merged;
};

const getMemberId = (member: unknown): string => {
  if (!member) return '';
  if (typeof member === 'string') return member;
  if (typeof member === 'object') {
    const m = member as Record<string, unknown>;
    const raw = m._id ?? m.id;
    return typeof raw === 'string' ? raw : String(raw ?? '');
  }
  return '';
};

const getMemberName = (member: unknown): string => {
  if (member && typeof member === 'object') {
    const m = member as Record<string, unknown>;
    if (typeof m.name === 'string' && m.name) return m.name;
    if (typeof m.username === 'string' && m.username) return m.username;
  }
  return '';
};

const getMemberAvatar = (member: unknown): string => {
  if (member && typeof member === 'object') {
    const m = member as Record<string, unknown>;
    if (typeof m.avatar === 'string') return m.avatar;
  }
  return '';
};

/**
 * Map a backend room to a ChatItem, preserving the 1-to-1 counterpart id.
 * The online indicator compares userIds, NOT roomIds — so targetUserId is required.
 */
const mapApiRoomToChatItem = (r: ApiRoom, currentUserId: string): ChatItem => {
  const roomId = String(r._id);
  const rawRoomname = typeof r.roomname === 'string' ? r.roomname : 'Chat';
  const isDirect = Boolean(r.isDirect) || rawRoomname.startsWith('direct_');
  const createdAt = r.createdAt || (r as unknown as { createdAt?: string }).createdAt;

  if (isDirect) {
    // Preferred: backend-resolved counterpart.
    const contact = r.contactUser;
    if (contact) {
      const contactId = String(contact.id || contact._id || '');
      const displayName = contact.name || r.displayName || rawRoomname;
      if (contactId) {
        return {
          id: roomId,
          targetUserId: contactId,
          name: displayName,
          initials: displayName.slice(0, 2).toUpperCase(),
          avatar: contact.avatar || r.avatar || '',
          avatarBg: '#6f7771',
          lastMessage: r.description || 'No messages yet',
          time: new Date(createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          unread: 0,
          online: false,
          isGroup: false,
          statusText: contact.about || r.description || 'Direct conversation',
        };
      }
    }

    // Fallback: derive counterpart from populated members.
    if (Array.isArray(r.members) && r.members.length > 0) {
      const other = r.members.find((m) => getMemberId(m) && getMemberId(m) !== String(currentUserId || ''))
        || r.members[0];
      const otherId = getMemberId(other);
      const otherName = getMemberName(other) || r.displayName || rawRoomname;
      if (otherId) {
        return {
          id: roomId,
          targetUserId: otherId,
          name: otherName,
          initials: otherName.slice(0, 2).toUpperCase(),
          avatar: getMemberAvatar(other) || r.avatar || '',
          avatarBg: '#6f7771',
          lastMessage: r.description || 'No messages yet',
          time: new Date(createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          unread: 0,
          online: false,
          isGroup: false,
          statusText: r.description || 'Direct conversation',
        };
      }
    }

    // Last resort: parse direct_<id1>_<id2> roomname for the peer id.
    const match = rawRoomname.match(/^direct_([a-f0-9]{24})_([a-f0-9]{24})$/i);
    if (match) {
      const peerId = match[1] === String(currentUserId) ? match[2] : match[1];
      const displayName = r.displayName && !r.displayName.startsWith('direct_') ? r.displayName : 'Direct Message';
      return {
        id: roomId,
        targetUserId: peerId,
        name: displayName,
        initials: displayName.slice(0, 2).toUpperCase(),
        avatar: r.avatar || '',
        avatarBg: '#6f7771',
        lastMessage: r.description || 'No messages yet',
        time: new Date(createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        unread: 0,
        online: false,
        isGroup: false,
        statusText: r.description || 'Direct conversation',
      };
    }
  }

  const groupName = (r.displayName && !r.displayName.startsWith('direct_') ? r.displayName : rawRoomname) || 'Group';
  return {
    id: roomId,
    name: groupName,
    initials: groupName.slice(0, 2).toUpperCase(),
    avatar: r.avatar || '',
    avatarBg: '#6f7771',
    lastMessage: r.description || 'No messages yet',
    time: new Date(createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    unread: 0,
    online: false,
    isGroup: !isDirect,
    statusText: r.description || 'Group conversation',
  };
};

const mapApiRoomToRecent = (r: ApiRoom, currentUserId: string): RecentChatUser => {
  const chat = mapApiRoomToChatItem(r, currentUserId);
  return {
    id: `recent-${r._id}`,
    targetUserId: chat.targetUserId,
    name: chat.name,
    fullName: chat.name,
    avatar: chat.avatar,
    initials: chat.initials,
    avatarBg: chat.avatarBg,
    online: false,
    chatId: String(r._id),
  };
};

export function useChat(): UseChatReturn {
  // Initialize from persistent storage so refresh NEVER loses messages or rooms
  const [chats, setChats] = useState<ChatItem[]>(() => chatStorage.getChats());
  const [recentChats, setRecentChats] = useState<RecentChatUser[]>(() => chatStorage.getRecent());
  const [activeChatId, setActiveChatId] = useState<string>(() => chatStorage.getActiveRoomId());
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>(() => {
    const initialActiveId = chatStorage.getActiveRoomId();
    if (initialActiveId) {
      return { [initialActiveId]: chatStorage.getRoomMessages(initialActiveId) };
    }
    return {};
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading] = useState(false);

  const currentUser = useMemo(() => authService.getStoredUser(), []);
  const currentUserId = currentUser?.id || currentUser?._id || '';

  const activeChat = useMemo(() => {
    return chats.find((chat) => chat.id === activeChatId) || null;
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
        const mappedMsgs = backendMsgs.map((message: ApiMessage) => mapApiMessage(message, currentUserId));

        setMessages((prev) => {
          const localSaved = chatStorage.getRoomMessages(roomId);
          const unique = mergeChatMessages(localSaved, mappedMsgs);
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
        const mappedChats: ChatItem[] = backendRooms.map((r: ApiRoom) => mapApiRoomToChatItem(r, currentUserId));

        setChats((prev) => {
          // Preserve per-chat UI state (lastMessage/unread) from cache, but always
          // refresh identity fields (targetUserId/name/avatar/isGroup) from server.
          const prevById = new Map(prev.map((item) => [item.id, item]));
          const merged = mappedChats.map((mapped) => {
            const cached = prevById.get(mapped.id);
            if (!cached) return mapped;
            return {
              ...mapped,
              lastMessage: cached.lastMessage || mapped.lastMessage,
              time: cached.time || mapped.time,
              unread: cached.unread ?? 0,
            };
          });
          prev.forEach((cached) => {
            if (!merged.some((m) => m.id === cached.id)) merged.push(cached);
          });
          chatStorage.saveChats(merged);
          return merged;
        });

        const recents: RecentChatUser[] = backendRooms.slice(0, 6).map((r: ApiRoom) => mapApiRoomToRecent(r, currentUserId));

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
  }, [currentUserId]);

  // Initial fetch on mount & window focus
  useEffect(() => {
    let isSubscribed = true;

    chatApi.getRooms().then((backendRooms) => {
      if (!isSubscribed || !backendRooms || !Array.isArray(backendRooms) || backendRooms.length === 0) return;
      const mappedChats: ChatItem[] = backendRooms.map((r: ApiRoom) => mapApiRoomToChatItem(r, currentUserId));

      setChats((prev) => {
        const prevById = new Map(prev.map((item) => [item.id, item]));
        const merged = mappedChats.map((mapped) => {
          const cached = prevById.get(mapped.id);
          if (!cached) return mapped;
          return {
            ...mapped,
            lastMessage: cached.lastMessage || mapped.lastMessage,
            time: cached.time || mapped.time,
            unread: cached.unread ?? 0,
          };
        });
        prev.forEach((cached) => {
          if (!merged.some((m) => m.id === cached.id)) merged.push(cached);
        });
        chatStorage.saveChats(merged);
        return merged;
      });

      const recents: RecentChatUser[] = backendRooms.slice(0, 6).map((r: ApiRoom) => mapApiRoomToRecent(r, currentUserId));
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

    const handleFocus = () => {
      fetchBackendRooms();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      isSubscribed = false;
      unbindRoomCreated();
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchBackendRooms]);

  // Load messages whenever activeChatId changes
  useEffect(() => {
    if (!activeChatId) return;
    let isSubscribed = true;

    chatApi.getMessages({ roomId: activeChatId }).then((backendMsgs) => {
      if (!isSubscribed || !backendMsgs || !Array.isArray(backendMsgs) || backendMsgs.length === 0) return;
      const mappedMsgs = backendMsgs.map((message: ApiMessage) => mapApiMessage(message, currentUserId));

      setMessages((prev) => {
        const localSaved = chatStorage.getRoomMessages(activeChatId);
        const unique = mergeChatMessages(localSaved, mappedMsgs);
        chatStorage.saveRoomMessages(activeChatId, unique);
        return {
          ...prev,
          [activeChatId]: unique
        };
      });
    }).catch(() => {});

    socketService.getMessages(activeChatId);

    return () => {
      isSubscribed = false;
    };
  }, [activeChatId, currentUserId]);

  // Listen for real-time socket messages
  useEffect(() => {
    const unbindReceive = socketService.on('receiveMessage', (data: unknown) => {
      if (!data || typeof data !== 'object') return;

      const payload = data as Record<string, unknown>;
      const roomId = typeof payload.roomId === 'string' ? payload.roomId : String(payload.roomId || '');
      if (!roomId) return;

      const nowIso = new Date().toISOString();
      const apiMessage: ApiMessage = {
        _id: typeof payload._id === 'string' ? payload._id : `msg-${Date.now()}`,
        roomId,
        userId: (payload.userId || '') as ApiMessage['userId'],
        text: typeof payload.text === 'string' ? payload.text : '',
        type: typeof payload.type === 'string' ? payload.type : 'text',
        meta: payload.meta && typeof payload.meta === 'object' ? payload.meta as Record<string, unknown> : {},
        createdAt: typeof payload.createdAt === 'string' ? payload.createdAt : nowIso,
        updatedAt: typeof payload.updatedAt === 'string' ? payload.updatedAt : nowIso,
      };
      const incomingMsg = mapApiMessage(apiMessage, currentUserId, activeChat?.name || 'User');
      const currentTime = incomingMsg.time;

      setMessages((prev) => {
        const existing = prev[roomId] || chatStorage.getRoomMessages(roomId) || [];
        const updated = mergeChatMessages(existing, [incomingMsg]);
        chatStorage.saveRoomMessages(roomId, updated);
        return {
          ...prev,
          [roomId]: updated,
        };
      });

      const lastMessage = incomingMsg.type === 'document'
        ? (incomingMsg.fileName || 'Document')
        : incomingMsg.type === 'photo'
          ? (incomingMsg.caption || 'Photo')
          : incomingMsg.type === 'video'
            ? (incomingMsg.caption || 'Video')
            : incomingMsg.text || 'Attachment';

      const incomingMediaType: ChatItem['mediaType'] = incomingMsg.type === 'document'
        ? 'document'
        : incomingMsg.type === 'photo'
          ? 'photo'
          : undefined;

      setChats((prevChats) => {
        const updated = prevChats.map((chat) => {
          if (chat.id !== roomId) return chat;
          return {
            ...chat,
            lastMessage,
            mediaType: incomingMediaType,
            time: currentTime,
            unread: chat.id === activeChatId ? 0 : (chat.unread || 0) + 1,
          };
        });
        chatStorage.saveChats(updated);
        return updated;
      });
    });

    const unbindList = socketService.on('messages:list', (data: unknown) => {
      if (data && typeof data === 'object' && 'roomId' in data && 'messages' in data) {
        const roomId = String(data.roomId);
        const msgs = Array.isArray(data.messages) ? data.messages : [];
        if (msgs.length > 0) {
          const mappedMsgs = msgs.map((message: ApiMessage) => mapApiMessage(message, currentUserId));

          setMessages((prev) => {
            const localSaved = chatStorage.getRoomMessages(roomId);
            const unique = mergeChatMessages(localSaved, mappedMsgs);
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
  }, [activeChatId, activeChat, currentUserId]);

  // Select chat handler
  const selectChat = useCallback((id: string) => {
    if (!chats.some((chat) => chat.id === id)) {
      void fetchBackendRooms();
    }

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
  }, [chats, fetchBackendRooms, loadBackendMessages]);

  // Send once through Socket.IO when connected, with a REST fallback for disconnected sessions.
  const sendMessage = useCallback(async (text: string, type: string = 'text', meta: Record<string, unknown> = {}) => {
    const cleanText = text.trim();
    const targetRoomId = activeChatId;
    if (!cleanText || !targetRoomId) return;

    const now = new Date();
    const hours = String(now.getHours() % 12 || 12).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
    const currentTime = `${hours}:${minutes} ${ampm}`;
    const tempId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const wireMeta: Record<string, unknown> = {
      ...meta,
      clientMessageId: tempId,
    };
    const nowIso = now.toISOString();
    const newMsg = mapApiMessage({
      _id: tempId,
      userId: currentUserId,
      roomId: targetRoomId,
      text: cleanText,
      type,
      meta: wireMeta,
      createdAt: nowIso,
      updatedAt: nowIso,
    }, currentUserId, 'You');
    newMsg.time = currentTime;

    setMessages((prev) => {
      const existing = prev[targetRoomId] || chatStorage.getRoomMessages(targetRoomId) || [];
      const updated = mergeChatMessages(existing, [newMsg]);
      chatStorage.saveRoomMessages(targetRoomId, updated);
      return {
        ...prev,
        [targetRoomId]: updated,
      };
    });

    try {
      const saved = socketService.isConnected()
        ? await socketService.sendMessageWithAck<ApiMessage>(targetRoomId, cleanText, type, wireMeta)
        : await chatApi.createMessage({
            roomId: targetRoomId,
            text: cleanText,
            type,
            meta: wireMeta,
            userId: currentUserId,
          });
      const persisted = mapApiMessage(saved, currentUserId, 'You');
      setMessages((prev) => {
        const existing = prev[targetRoomId] || chatStorage.getRoomMessages(targetRoomId) || [];
        const updated = mergeChatMessages(existing, [persisted]);
        chatStorage.saveRoomMessages(targetRoomId, updated);
        return {
          ...prev,
          [targetRoomId]: updated,
        };
      });
    } catch (error) {
      setMessages((prev) => {
        const existing = prev[targetRoomId] || chatStorage.getRoomMessages(targetRoomId) || [];
        const updated = existing.filter((message) => (
          message.id !== tempId && getClientMessageId(message) !== tempId
        ));
        chatStorage.saveRoomMessages(targetRoomId, updated);
        return {
          ...prev,
          [targetRoomId]: updated,
        };
      });
      throw error instanceof Error ? error : new Error('Failed to send message.');
    }

    const computedMediaType: ChatItem['mediaType'] = type === 'photo'
      ? 'photo'
      : type === 'document'
        ? 'document'
        : undefined;
    setChats((prevChats: ChatItem[]) => {
      const updated: ChatItem[] = prevChats.map((chat) => {
        if (chat.id !== targetRoomId) return chat;
        return {
          ...chat,
          lastMessage: type === 'document' ? String(meta.fileName || 'Document') : cleanText,
          mediaType: computedMediaType,
          time: currentTime,
          unread: 0,
        };
      });

      const currentChatIndex = updated.findIndex((chat) => chat.id === targetRoomId);
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
      await loadBackendMessages(activeChatId);
    } catch {
      // Saved locally
    }
  }, [activeChatId, loadBackendMessages]);

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
  const deleteMessage = useCallback(async (messageId: string, deleteType: 'forMe' | 'forEveryone' = 'forEveryone') => {
    setMessages((prev) => {
      const updated = (prev[activeChatId] || []).filter((m) => m.id !== messageId);
      chatStorage.saveRoomMessages(activeChatId, updated);
      return {
        ...prev,
        [activeChatId]: updated
      };
    });
    socketService.deleteMessage(messageId, deleteType);
    try {
      await chatApi.deleteMessage(messageId, deleteType);
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
