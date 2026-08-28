import { ChatItem, RecentChatUser } from '../UI/ChatList';
import { ChatMessage } from '../UI/ChatArea';
import { GroupItem } from '../UI/GroupsSection';

const CHATS_KEY = 'chatSocial_persisted_chats';
const RECENT_KEY = 'chatSocial_persisted_recent';
const ACTIVE_ROOM_KEY = 'chatSocial_active_room_id';
const MESSAGES_PREFIX = 'chatSocial_msgs_';
const GROUPS_KEY = 'chatSocial_persisted_groups';

// Helper to generate a valid 24-character hex MongoDB ObjectId for frontend sessions
export function generateValidObjectId(): string {
  const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
  const randomHex = Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
  return (timestamp + randomHex).slice(0, 24);
}

const DEFAULT_INITIAL_CHATS: ChatItem[] = [
  {
    id: '67b848e02d68e3a2b0000001',
    name: 'General',
    initials: 'GE',
    avatarBg: '#6366f1',
    lastMessage: 'Welcome to chatSocial! Send a message to get started.',
    time: 'Just now',
    unread: 0,
    online: true,
    statusText: 'Public Community Room'
  },
  {
    id: '67b848e02d68e3a2b0000002',
    name: 'Developers',
    initials: 'DE',
    avatarBg: '#ec4899',
    lastMessage: 'Discuss WebRTC, Socket.IO & architecture',
    time: 'Just now',
    unread: 0,
    online: true,
    statusText: 'Tech & Architecture'
  }
];

export const chatStorage = {
  // Chats
  getChats(): ChatItem[] {
    try {
      const saved = localStorage.getItem(CHATS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      return DEFAULT_INITIAL_CHATS;
    } catch {
      return DEFAULT_INITIAL_CHATS;
    }
  },

  saveChats(chats: ChatItem[]): void {
    try {
      localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
    } catch (e) {
      console.warn('Failed to save chats to localStorage', e);
    }
  },

  // Recent contacts
  getRecent(): RecentChatUser[] {
    try {
      const saved = localStorage.getItem(RECENT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
      return [
        {
          id: 'recent-general',
          name: 'General',
          fullName: 'General Room',
          initials: 'GE',
          avatarBg: '#6366f1',
          online: true,
          chatId: '67b848e02d68e3a2b0000001'
        },
        {
          id: 'recent-developers',
          name: 'Developers',
          fullName: 'Developers Room',
          initials: 'DE',
          avatarBg: '#ec4899',
          online: true,
          chatId: '67b848e02d68e3a2b0000002'
        }
      ];
    } catch {
      return [];
    }
  },

  saveRecent(recents: RecentChatUser[]): void {
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(recents));
    } catch (e) {
      console.warn('Failed to save recent contacts', e);
    }
  },

  // Active room ID
  getActiveRoomId(): string {
    try {
      const saved = localStorage.getItem(ACTIVE_ROOM_KEY);
      if (saved) return saved;
      const chats = this.getChats();
      return chats.length > 0 ? chats[0].id : '';
    } catch {
      return '';
    }
  },

  saveActiveRoomId(roomId: string): void {
    try {
      localStorage.setItem(ACTIVE_ROOM_KEY, roomId);
    } catch (e) {
      console.warn('Failed to save active room ID', e);
    }
  },

  // Messages per room
  getRoomMessages(roomId: string): ChatMessage[] {
    if (!roomId) return [];
    try {
      const saved = localStorage.getItem(`${MESSAGES_PREFIX}${roomId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  },

  saveRoomMessages(roomId: string, messages: ChatMessage[]): void {
    if (!roomId) return;
    try {
      localStorage.setItem(`${MESSAGES_PREFIX}${roomId}`, JSON.stringify(messages));
    } catch (e) {
      console.warn(`Failed to save messages for room ${roomId}`, e);
    }
  },

  // Groups
  getGroups(): GroupItem[] {
    try {
      const saved = localStorage.getItem(GROUPS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  },

  saveGroups(groups: GroupItem[]): void {
    try {
      localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
    } catch (e) {
      console.warn('Failed to save groups', e);
    }
  }
};

export default chatStorage;
