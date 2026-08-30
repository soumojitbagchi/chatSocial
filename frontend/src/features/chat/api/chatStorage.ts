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

export const chatStorage = {
  // Chats
  getChats(): ChatItem[] {
    try {
      const saved = localStorage.getItem(CHATS_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
      return [];
    } catch {
      return [];
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
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
      return [];
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

  removeRoomMessages(roomId: string): void {
    if (!roomId) return;
    try {
      localStorage.removeItem(`${MESSAGES_PREFIX}${roomId}`);
    } catch (e) {
      console.warn(`Failed to remove messages for room ${roomId}`, e);
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
  },

  clearAll(): void {
    try {
      localStorage.removeItem(CHATS_KEY);
      localStorage.removeItem(RECENT_KEY);
      localStorage.removeItem(ACTIVE_ROOM_KEY);
      localStorage.removeItem(GROUPS_KEY);
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(MESSAGES_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (e) {
      console.warn('Failed to clear chat storage', e);
    }
  },
};
export default chatStorage;
