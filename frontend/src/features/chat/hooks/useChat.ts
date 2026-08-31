import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ChatItem, RecentChatUser } from '../UI/ChatList';
import { ChatMessage } from '../UI/ChatArea';
import { chatApi, ApiMessage, ApiRoom, ConnectionsData } from '../api/chatApi';
import { socketService } from '../api/socketService';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
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
  isLoadingMore: boolean;
  hasMoreMessages: boolean;
  setSearchQuery: (q: string) => void;
  selectChat: (id: string) => void;
  sendMessage: (text: string, type?: string, meta?: Record<string, unknown>) => Promise<void>;
  editMessage: (messageId: string, text: string) => Promise<void>;
  createNewContact: (name: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  addReaction: (messageId: string, emoji: string) => void;
  loadBackendMessages: (roomId: string) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  fetchBackendRooms: () => Promise<void>;
  connections: ConnectionsData;
  fetchConnections: () => Promise<void>;
  acceptConnectionRequest: (targetUserId: string) => Promise<{ success: boolean; message: string; status: string; room?: ApiRoom }>;
  rejectConnectionRequest: (targetUserId: string) => Promise<{ success: boolean; message: string }>;
}

export const mapApiMessageToChatMessage = (m: ApiMessage, currentUserId?: string | null): ChatMessage => {
  const senderId = typeof m.userId === 'object' && m.userId !== null ? m.userId._id : m.userId;
  const senderName = typeof m.userId === 'object' && m.userId !== null ? m.userId.name : 'User';
  const isMe = Boolean(currentUserId && senderId === currentUserId);
  const msgMeta = (m.meta as Record<string, unknown>) || {};
  const msgType = (m.type as ChatMessage['type']) || 'text';

  return {
    id: m._id,
    sender: isMe ? 'me' : 'other',
    senderName: isMe ? 'You' : senderName,
    type: msgType,
    text: m.text,
    time: new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    status: 'read',
    imageUrl: (msgMeta.imageUrl || msgMeta.photoUrl || msgMeta.url || msgMeta.mediaUrl) as string | undefined,
    photoUrl: (msgMeta.imageUrl || msgMeta.photoUrl || msgMeta.url || msgMeta.mediaUrl) as string | undefined,
    audioUrl: (msgMeta.audioUrl || msgMeta.url) as string | undefined,
    fileName: (msgMeta.fileName || m.text) as string | undefined,
    fileSize: msgMeta.fileSize as string | undefined,
    fileType: msgMeta.fileType as string | undefined,
    caption: msgMeta.caption as string | undefined,
    meta: msgMeta,
  };
};

export function useChat(): UseChatReturn {
  const [chats, setChats] = useState<ChatItem[]>(() => chatStorage.getChats());
  const [recentChats, setRecentChats] = useState<RecentChatUser[]>(() => chatStorage.getRecent());
  const [activeChatId, setActiveChatId] = useState<string>(() => chatStorage.getActiveRoomId());
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [roomPageMap, setRoomPageMap] = useState<Record<string, number>>({});
  const [hasMoreMap, setHasMoreMap] = useState<Record<string, boolean>>({});
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading] = useState(false);
  const [connections, setConnections] = useState<ConnectionsData>({
    contacts: [],
    pendingIncoming: [],
    pendingOutgoing: [],
  });
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
    return messages[activeChatId] || [];
  }, [messages, activeChatId]);

  const loadBackendMessages = useCallback(
    async (roomId: string) => {
      if (!roomId) return;
      try {
        const backendMsgs = await chatApi.getMessages({ roomId, limit: 50, page: 1 });
        const mappedMsgs: ChatMessage[] = Array.isArray(backendMsgs)
          ? backendMsgs.slice(-50).map((m: ApiMessage) => mapApiMessageToChatMessage(m, currentUserId))
          : [];

        // Deduplicate by message ID
        const seen = new Set<string>();
        const deduped: ChatMessage[] = [];
        for (const m of mappedMsgs) {
          if (!seen.has(m.id)) {
            seen.add(m.id);
            deduped.push(m);
          }
        }

        setMessages((prev) => ({
          ...prev,
          [roomId]: deduped,
        }));
        setRoomPageMap((prev) => ({ ...prev, [roomId]: 1 }));
        setHasMoreMap((prev) => ({ ...prev, [roomId]: Array.isArray(backendMsgs) && backendMsgs.length >= 50 }));
      } catch (err) {
        console.warn(`Could not fetch remote messages for room ${roomId}:`, err);
      }
    },
    [currentUserId]
  );

  const loadMoreMessages = useCallback(async () => {
    const targetRoom = activeChatId;
    if (!targetRoom || isLoadingMore || hasMoreMap[targetRoom] === false) return;

    const currentPage = roomPageMap[targetRoom] || 1;
    const nextPage = currentPage + 1;
    setIsLoadingMore(true);

    try {
      const olderMsgs = await chatApi.getMessages({ roomId: targetRoom, limit: 50, page: nextPage });
      if (Array.isArray(olderMsgs) && olderMsgs.length > 0) {
        const mappedOlder: ChatMessage[] = olderMsgs.map((m: ApiMessage) => mapApiMessageToChatMessage(m, currentUserId));

        setMessages((prev) => {
          const currentList = prev[targetRoom] || [];
          const existingIds = new Set(currentList.map((m) => m.id));
          const filteredNewOlder = mappedOlder.filter((m) => !existingIds.has(m.id));
          return {
            ...prev,
            [targetRoom]: [...filteredNewOlder, ...currentList],
          };
        });

        setRoomPageMap((prev) => ({ ...prev, [targetRoom]: nextPage }));
        setHasMoreMap((prev) => ({ ...prev, [targetRoom]: olderMsgs.length >= 50 }));
      } else {
        setHasMoreMap((prev) => ({ ...prev, [targetRoom]: false }));
      }
    } catch (err) {
      console.warn('Failed to load older messages:', err);
      setHasMoreMap((prev) => ({ ...prev, [targetRoom]: false }));
    } finally {
      setIsLoadingMore(false);
    }
  }, [activeChatId, currentUserId, hasMoreMap, isLoadingMore, roomPageMap]);

  const fetchBackendRooms = useCallback(async () => {
    try {
      const backendRooms = await chatApi.getRooms();
      const mappedChats: ChatItem[] = Array.isArray(backendRooms)
        ? backendRooms.map((r: ApiRoom & { displayName?: string; isDirect?: boolean; contactUser?: { id?: string; name: string; avatar?: string }; members?: Array<{ _id?: string } | string> }) => {
          const roomTitle = r.displayName || r.contactUser?.name || r.roomname || 'Chat';
          const targetUserId = r.contactUser?.id || (
            r.isDirect && Array.isArray(r.members)
              ? (r.members.find((m) => {
                const mId = typeof m === 'object' && m !== null ? m._id : m;
                return mId && mId.toString() !== currentUserId;
              }) as { _id?: string } | string | undefined)
              : undefined
          );
          const resolvedTargetId = typeof targetUserId === 'object' && targetUserId !== null ? targetUserId._id : targetUserId;

          return {
            id: r._id,
            targetUserId: resolvedTargetId ? String(resolvedTargetId) : undefined,
            name: roomTitle,
            initials: roomTitle ? roomTitle.slice(0, 2).toUpperCase() : 'CH',
            avatar: r.avatar || r.contactUser?.avatar || '',
            avatarBg: '#6366f1',
            lastMessage: r.description || 'No messages yet',
            time: new Date(r.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            unread: 0,
            online: false,
            isGroup: !r.isDirect,
            statusText: r.description || (r.isDirect ? 'Direct Message' : 'Public Room'),
          };
        })
        : [];

      const lastMsgPromises = mappedChats.map(async (chat) => {
        try {
          const msgs = await chatApi.getMessages({ roomId: chat.id, limit: 1, page: 1 });
          if (Array.isArray(msgs) && msgs.length > 0) {
            const lastMsg = msgs[msgs.length - 1];
            return {
              id: chat.id,
              text: lastMsg.text || '',
              time: new Date(lastMsg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
          }
        } catch { }
        return null;
      });

      const lastMsgResults = await Promise.all(lastMsgPromises);
      const lastMsgMap = new Map<string, { text: string; time: string }>();
      for (const result of lastMsgResults) {
        if (result && result.text) {
          lastMsgMap.set(result.id, { text: result.text, time: result.time });
        }
      }

      const patchedChats = mappedChats.map((chat) => {
        const lastMsg = lastMsgMap.get(chat.id);
        if (lastMsg) {
          return { ...chat, lastMessage: lastMsg.text, time: lastMsg.time };
        }
        return chat;
      });

      setChats(patchedChats);
      chatStorage.saveChats(patchedChats);

      const recents: RecentChatUser[] = patchedChats.slice(0, 6).map((c) => ({
        id: `recent-${c.id}`,
        targetUserId: c.targetUserId,
        name: c.name,
        fullName: c.name,
        avatar: c.avatar,
        initials: c.initials,
        avatarBg: c.avatarBg,
        online: false,
        chatId: c.id,
      }));
      setRecentChats(recents);
      chatStorage.saveRecent(recents);
      setActiveChatId((prev) => {
        const targetId = patchedChats.some((c) => c.id === prev)
          ? prev
          : patchedChats.length > 0
            ? patchedChats[0].id
            : '';
        chatStorage.saveActiveRoomId(targetId);
        if (targetId) {
          socketService.joinRoom(targetId);
        }
        return targetId;
      });
    } catch (err) {
      console.warn('Could not fetch backend rooms:', err);
    }
  }, [currentUserId]);

  const fetchConnections = useCallback(async () => {
    try {
      const data = await chatApi.getConnections();
      if (data && typeof data === 'object') {
        setConnections({
          contacts: Array.isArray(data.contacts) ? data.contacts : [],
          pendingIncoming: Array.isArray(data.pendingIncoming) ? data.pendingIncoming : [],
          pendingOutgoing: Array.isArray(data.pendingOutgoing) ? data.pendingOutgoing : [],
        });
      }
    } catch (err) {
      console.warn('Could not fetch connections:', err);
    }
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    let isSubscribed = true;

    const initialTimer = setTimeout(() => {
      if (isSubscribed) {
        void fetchBackendRooms();
        void fetchConnections();
      }
    }, 0);

    const interval = setInterval(() => {
      if (isSubscribed && document.visibilityState === 'visible') {
        void fetchBackendRooms();
        void fetchConnections();
      }
    }, 15000);

    const handleVisibilityChange = () => {
      if (isSubscribed && document.visibilityState === 'visible') {
        void fetchBackendRooms();
        void fetchConnections();
      }
    };

    const handleOnline = () => {
      if (isSubscribed) {
        void fetchBackendRooms();
        void fetchConnections();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      isSubscribed = false;
      clearTimeout(initialTimer);
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, [currentUserId, fetchBackendRooms, fetchConnections]);

  useEffect(() => {
    const unbindRoomCreated = socketService.on('room:created', (data: unknown) => {
      if (data && typeof data === 'object' && 'roomId' in data && 'roomname' in data) {
        const roomId = String(data.roomId);
        const roomname = data.roomname ? String(data.roomname) : 'New Room';
        const description = 'description' in data && typeof data.description === 'string' ? data.description : '';

        const newChat: ChatItem = {
          id: roomId,
          name: roomname,
          initials: roomname ? roomname.slice(0, 2).toUpperCase() : 'NR',
          avatarBg: '#6f7771',
          lastMessage: description || 'New room created',
          time: 'Just now',
          unread: 0,
          online: false,
          statusText: description,
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
      unbindRoomCreated();
    };
  }, []);

  useEffect(() => {
    if (!activeChatId) return;
    let isSubscribed = true;

    const syncActiveMessages = () => {
      if (!activeChatId) return;
      chatApi.getMessages({ roomId: activeChatId, limit: 50, page: 1 }).then((backendMsgs) => {
        if (!isSubscribed) return;
        const mappedMsgs: ChatMessage[] = Array.isArray(backendMsgs)
          ? backendMsgs.slice(-50).map((m: ApiMessage) => mapApiMessageToChatMessage(m, currentUserId))
          : [];

        const seen = new Set<string>();
        const deduped: ChatMessage[] = [];
        for (const m of mappedMsgs) {
          if (!seen.has(m.id)) {
            seen.add(m.id);
            deduped.push(m);
          }
        }

        setMessages((prev) => {
          const current = prev[activeChatId] || [];
          const pendingOptimistic = current.filter((m) => m.id.startsWith('msg-') && !seen.has(m.id));
          const finalMsgs = [...deduped, ...pendingOptimistic].slice(-50);

          if (current.length === finalMsgs.length && current.every((c, i) => c.id === finalMsgs[i]?.id && c.text === finalMsgs[i]?.text)) {
            return prev;
          }
          return {
            ...prev,
            [activeChatId]: finalMsgs,
          };
        });
        setRoomPageMap((prev) => ({ ...prev, [activeChatId]: 1 }));
        setHasMoreMap((prev) => ({ ...prev, [activeChatId]: Array.isArray(backendMsgs) && backendMsgs.length >= 50 }));
      }).catch(() => { });
    };

    syncActiveMessages();

    const interval = setInterval(() => {
      if (isSubscribed && document.visibilityState === 'visible') {
        syncActiveMessages();
      }
    }, 10000);

    const handleFocus = () => {
      if (isSubscribed && document.visibilityState === 'visible') {
        syncActiveMessages();
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', handleFocus);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('visibilitychange', handleFocus);
    };
  }, [activeChatId, currentUserId]);

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

          const rawType = 'type' in data && typeof data.type === 'string' ? data.type : 'text';
          const rawMeta = 'meta' in data && typeof data.meta === 'object' && data.meta !== null ? (data.meta as Record<string, unknown>) : {};

          const incomingMsg: ChatMessage = {
            id: msgId,
            sender: isMe ? 'me' : 'other',
            senderName: isMe ? 'You' : senderName,
            type: (rawType as ChatMessage['type']) || 'text',
            text,
            time: currentTime,
            status: 'read',
            imageUrl: (rawMeta.imageUrl || rawMeta.photoUrl) as string | undefined,
            photoUrl: (rawMeta.imageUrl || rawMeta.photoUrl) as string | undefined,
            audioUrl: rawMeta.audioUrl as string | undefined,
            fileName: rawMeta.fileName as string | undefined,
            fileSize: rawMeta.fileSize as string | undefined,
            fileType: rawMeta.fileType as string | undefined,
            caption: rawMeta.caption as string | undefined,
            meta: rawMeta,
          };

          setMessages((prev) => {
            const existing = prev[roomId] || [];
            if (existing.some((m) => m.id === msgId)) {
              return prev;
            }

            const optIndex = isMe ? existing.findIndex((m) => m.id.startsWith('msg-') && m.text === text) : -1;
            let updated: ChatMessage[];
            if (optIndex > -1) {
              updated = existing.map((m, i) => (i === optIndex ? incomingMsg : m));
            } else {
              updated = [...existing, incomingMsg];
            }
            return {
              ...prev,
              [roomId]: updated.slice(-50),
            };
          });
          setChats((prevChats) => {
            const updated = prevChats.map((c) => {
              if (c.id === roomId) {
                return {
                  ...c,
                  lastMessage: text,
                  time: currentTime,
                  unread: c.id === activeChatIdRef.current ? 0 : (c.unread || 0) + 1,
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
          const mappedMsgs: ChatMessage[] = msgs.slice(-50).map((m: ApiMessage) => mapApiMessageToChatMessage(m, currentUserId));

          setMessages((prev) => ({
            ...prev,
            [roomId]: mappedMsgs,
          }));
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
          return {
            ...prev,
            [roomId]: updated,
          };
        });
      }
    });

    const unbindDeleted = socketService.on('messageDeleted', (data: unknown) => {
      if (data && typeof data === 'object' && 'messageId' in data && 'roomId' in data) {
        const messageId = String(data.messageId);
        const roomId = String(data.roomId);
        setMessages((prev) => {
          const remaining = (prev[roomId] || []).filter((m) => m.id !== messageId);


          setChats((prevChats) => {
            const lastRemaining = remaining[remaining.length - 1];
            const updatedChats = prevChats.map((c) => {
              if (c.id === roomId) {
                return {
                  ...c,
                  lastMessage: lastRemaining ? (lastRemaining.text || 'Shared attachment') : (c.statusText || 'No messages yet'),
                  time: lastRemaining ? lastRemaining.time : c.time,
                };
              }
              return c;
            });
            chatStorage.saveChats(updatedChats);
            return updatedChats;
          });

          return {
            ...prev,
            [roomId]: remaining,
          };
        });
      }
    });

    const unbindConnReceived = socketService.on('connection:received', () => {
      void fetchConnections();
    });
    const unbindConnRequest = socketService.on('connection:request', () => {
      void fetchConnections();
    });
    const unbindConnAccepted = socketService.on('connection:accepted', () => {
      void fetchConnections();
      void fetchBackendRooms();
    });
    const unbindConnRejected = socketService.on('connection:rejected', () => {
      void fetchConnections();
    });

    return () => {
      unbindReceive();
      unbindList();
      unbindUpdated();
      unbindDeleted();
      unbindConnReceived();
      unbindConnRequest();
      unbindConnAccepted();
      unbindConnRejected();
    };
  }, [currentUserId, fetchConnections, fetchBackendRooms]);

  const selectChat = useCallback(
    (id: string) => {
      setActiveChatId((prevOldId) => {
        chatStorage.saveActiveRoomId(id);
        if (prevOldId && prevOldId !== id) {
          socketService.switchRoom(prevOldId, id);
        } else {
          socketService.joinRoom(id);
        }
        return id;
      });

      loadBackendMessages(id);

      setChats((prev) => {
        const updated = prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c));
        chatStorage.saveChats(updated);
        return updated;
      });
    },
    [loadBackendMessages]
  );

  const sendMessage = useCallback(
    async (text: string, type: string = 'text', meta: Record<string, unknown> = {}) => {
      const cleanText = text.trim();
      if (!cleanText || !activeChatId) return;

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
        text: cleanText,
        time: currentTime,
        status: 'read',
        imageUrl: (meta.imageUrl || meta.photoUrl || meta.url || meta.mediaUrl) as string | undefined,
        photoUrl: (meta.imageUrl || meta.photoUrl || meta.url || meta.mediaUrl) as string | undefined,
        audioUrl: (meta.audioUrl || meta.url) as string | undefined,
        fileName: (meta.fileName || cleanText) as string | undefined,
        fileSize: meta.fileSize as string | undefined,
        fileType: meta.fileType as string | undefined,
        caption: meta.caption as string | undefined,
        meta,
      };

      setMessages((prev) => {
        const existing = prev[activeChatId] || [];
        const updated = [...existing, newMsg].slice(-50);
        return {
          ...prev,
          [activeChatId]: updated,
        };
      });

      if (socketService.isConnected()) {
        socketService.sendMessage(activeChatId, cleanText, type, meta);
      } else {
        // Fallback to REST API only when socket is disconnected
        chatApi.createMessage({
          roomId: activeChatId,
          text: cleanText,
          type,
          meta,
        }).then((saved) => {
          if (saved && saved._id) {
            setMessages((prev) => {
              const list = prev[activeChatId] || [];
              return {
                ...prev,
                [activeChatId]: list.map((m) => (m.id === tempId ? { ...m, id: saved._id } : m)),
              };
            });
          }
        }).catch((err) => {
          console.warn('REST createMessage fallback notice:', err);
        });
      }

      const computedMediaType: ChatItem['mediaType'] =
        type === 'photo' ? 'photo' : type === 'document' ? 'document' : undefined;

      setChats((prevChats: ChatItem[]) => {
        const updated: ChatItem[] = prevChats.map((c) => {
          if (c.id === activeChatId) {
            return {
              ...c,
              lastMessage: type === 'document' ? String(meta.fileName || 'Document') : cleanText,
              mediaType: computedMediaType,
              time: currentTime,
              unread: 0,
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
    },
    [activeChatId]
  );

  const editMessage = useCallback(
    async (messageId: string, text: string) => {
      setMessages((prev) => {
        const updated = (prev[activeChatId] || []).map((m) => (m.id === messageId ? { ...m, text } : m));
        return {
          ...prev,
          [activeChatId]: updated,
        };
      });
      socketService.editMessage(messageId, text);
      try {
        await chatApi.updateMessage(messageId, { text });
      } catch { }
    },
    [activeChatId]
  );

  const createNewContact = useCallback(
    async (name: string) => {
      const validId = generateValidObjectId();
      const cleanRoomName = name.trim();

      try {
        const createdRoom = await chatApi.createRoom({ roomname: cleanRoomName, description: 'Direct chat room' });
        const newId = createdRoom._id || validId;
        const newChat: ChatItem = {
          id: newId,
          name: createdRoom.roomname || cleanRoomName,
          initials: cleanRoomName.slice(0, 2).toUpperCase(),
          avatarBg: '#6366f1',
          lastMessage: 'Room created',
          time: 'Just now',
          unread: 0,
          online: false,
          statusText: createdRoom.description || 'Available',
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

        await fetchBackendRooms();
      } catch {
        const newChat: ChatItem = {
          id: validId,
          name: cleanRoomName,
          initials: cleanRoomName.slice(0, 2).toUpperCase(),
          avatarBg: '#6366f1',
          lastMessage: 'Conversation started',
          time: 'Just now',
          unread: 0,
          online: false,
          statusText: 'Available',
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
    },
    [fetchBackendRooms]
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!messageId || !activeChatId) return;

      const previousMessages = messages[activeChatId] || [];

      setMessages((prev) => {
        const remaining = (prev[activeChatId] || []).filter((m) => m.id !== messageId);

        setChats((prevChats) => {
          const lastRemaining = remaining[remaining.length - 1];
          const updatedChats = prevChats.map((c) => {
            if (c.id === activeChatId) {
              return {
                ...c,
                lastMessage: lastRemaining ? (lastRemaining.text || 'Shared attachment') : (c.statusText || 'No messages yet'),
                time: lastRemaining ? lastRemaining.time : c.time,
              };
            }
            return c;
          });
          chatStorage.saveChats(updatedChats);
          return updatedChats;
        });

        return {
          ...prev,
          [activeChatId]: remaining,
        };
      });

      socketService.deleteMessage(messageId);

      if (!messageId.startsWith('msg-')) {
        try {
          await chatApi.deleteMessage(messageId);
        } catch (err: unknown) {
          console.warn('Backend message delete sync notice:', err);
          setMessages((prev) => ({
            ...prev,
            [activeChatId]: previousMessages,
          }));
          const errMsg = err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
            : (err instanceof Error ? err.message : 'Failed to delete message');
          if (errMsg) alert(errMsg);
        }
      }
    },
    [activeChatId, messages]
  );

  const deleteChat = useCallback(
    async (chatId: string) => {
      if (!chatId) return;

      setChats((prevChats) => {
        const remainingChats = prevChats.filter((c) => c.id !== chatId);
        chatStorage.saveChats(remainingChats);

        setActiveChatId((currentActiveId) => {
          if (currentActiveId === chatId) {
            const nextChat = remainingChats.length > 0 ? remainingChats[0] : null;
            const nextId = nextChat ? nextChat.id : '';
            chatStorage.saveActiveRoomId(nextId);
            if (nextId) {
              socketService.joinRoom(nextId);
              loadBackendMessages(nextId);
            }
            return nextId;
          }
          return currentActiveId;
        });

        return remainingChats;
      });

      setRecentChats((prevRecent) => {
        const updatedRecent = prevRecent.filter(
          (r) => r.chatId !== chatId && r.id !== chatId && r.id !== `recent-${chatId}`
        );
        chatStorage.saveRecent(updatedRecent);
        return updatedRecent;
      });

      setMessages((prevMsgs) => {
        const updatedMsgs = { ...prevMsgs };
        delete updatedMsgs[chatId];
        chatStorage.removeRoomMessages(chatId);
        return updatedMsgs;
      });

      socketService.leaveRoom(chatId);

      try {
        await chatApi.deleteRoom(chatId);
        await fetchBackendRooms();
      } catch (err) {
        console.warn('Backend room delete sync notice:', err);
      }
    },
    [fetchBackendRooms, loadBackendMessages]
  );

  const addReaction = useCallback(
    (messageId: string, emoji: string) => {
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
        return {
          ...prev,
          [activeChatId]: updated,
        };
      });
    },
    [activeChatId]
  );
  const acceptConnectionRequest = useCallback(
    async (targetUserId: string) => {
      try {
        const res = await chatApi.acceptConnectionRequest(targetUserId);
        await fetchConnections();
        await fetchBackendRooms();
        socketService.emit('connection:accepted', { targetUserId });
        if (res.room?._id || res.room?.id) {
          const roomId = String(res.room._id || res.room.id);
          selectChat(roomId);
        }
        return res;
      } catch (err) {
        console.warn('Failed to accept connection request:', err);
        throw err;
      }
    },
    [fetchConnections, fetchBackendRooms, selectChat]
  );

  const rejectConnectionRequest = useCallback(
    async (targetUserId: string) => {
      try {
        const res = await chatApi.rejectConnectionRequest(targetUserId);
        await fetchConnections();
        socketService.emit('connection:rejected', { targetUserId });
        return res;
      } catch (err) {
        console.warn('Failed to reject connection request:', err);
        throw err;
      }
    },
    [fetchConnections]
  );


  return {
    chats,
    recentChats,
    activeChatId,
    activeChat,
    messages,
    activeMessages,
    searchQuery,
    isLoading,
    isLoadingMore,
    hasMoreMessages: Boolean(hasMoreMap[activeChatId]),
    setSearchQuery,
    selectChat,
    sendMessage,
    editMessage,
    createNewContact,
    deleteMessage,
    deleteChat,
    addReaction,
    loadBackendMessages,
    loadMoreMessages,
    fetchBackendRooms,
    connections,
    fetchConnections,
    acceptConnectionRequest,
    rejectConnectionRequest,
  };
}

export default useChat;
