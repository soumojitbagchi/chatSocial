import { createContext } from 'react';
import { UseSocketReturn } from '../hooks/useSocket';
import { UseChatReturn } from '../hooks/useChat';
import { UseGroupsReturn } from '../hooks/useGroups';
import { UseCallsReturn } from '../hooks/useCalls';
import { UseStatusReturn } from '../hooks/useStatus';

export interface ChatContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  showNewChatModal: boolean;
  totalUnread: number;
  isUserOnline: (id?: string) => boolean;
  socket: UseSocketReturn;
  chat: UseChatReturn;
  groups: UseGroupsReturn;
  calls: UseCallsReturn;
  status: UseStatusReturn;
}

export const ChatContext = createContext<ChatContextType | null>(null);
export default ChatContext;
