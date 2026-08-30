import React, { useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import { useSocket } from '../hooks/useSocket';
import { useChat } from '../hooks/useChat';
import { useGroups } from '../hooks/useGroups';
import { useCalls } from '../hooks/useCalls';
import { useStatus } from '../hooks/useStatus';
import { ChatContext, ChatContextType } from './chatContextObject';
export interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const { user } = useAuthContext();
  const [activeTab, setActiveTab] = useState<string>('chats');
  const [showNewChatModal, setShowNewChatModal] = useState<boolean>(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('chatSocial_theme') : null;
    return saved === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
    localStorage.setItem('chatSocial_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const socket = useSocket();
  const chat = useChat();
  const groups = useGroups();
  const calls = useCalls();
  const status = useStatus(user?.avatar);

  const totalUnread = chat.chats.reduce((acc, c) => acc + (c.unread || 0), 0);

  const onlineUserSet = useMemo(() => new Set(socket.onlineUsers), [socket.onlineUsers]);
  const isUserOnline = useCallback(
    (id?: string) => {
      if (!id) return false;
      return onlineUserSet.has(String(id));
    },
    [onlineUserSet]
  );

  const value: ChatContextType = {
    activeTab,
    setActiveTab,
    theme,
    toggleTheme,
    showNewChatModal,
    setShowNewChatModal,
    totalUnread,
    isUserOnline,
    socket,
    chat,
    groups,
    calls,
    status,
  };
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export default ChatProvider;
