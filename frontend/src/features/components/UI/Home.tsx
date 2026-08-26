import React, { useState, useMemo, useEffect } from 'react';
import SidebarRail from './SidebarRail';
import ChatList, { ChatItem, RecentChatUser } from './ChatList';
import ChatArea, { ChatMessage } from './ChatArea';
import GroupsSection, { GroupItem } from './GroupsSection';
import CallsSection, { CallLogItem } from './CallsSection';
import StatusSection, { StatusItem } from './StatusSection';
import SettingsSection, { UserProfileData } from './SettingsSection';
import NewChatModal from './NewChatModal';
import CallModal from './CallModal';
import StoryViewerModal from './StoryViewerModal';
import {
  CURRENT_USER,
  RECENT_CHATS,
  INITIAL_CHATS,
  INITIAL_MESSAGES,
  INITIAL_GROUPS,
  INITIAL_CALLS,
  INITIAL_STATUS_UPDATES
} from '../../data/dummyData';
import { authService } from '../../auth/api/authService';
import '../style/components.css';

export interface HomeProps {
  onLogout?: () => void;
}

export const Home = ({ onLogout }: HomeProps) => {
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' | 'contacts' | 'groups' | 'status' | 'calls' | 'settings' | 'profile'
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('chatSocial_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  // Keep documentElement and localStorage synchronized with theme state
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('chatSocial_theme', theme);
  }, [theme]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data state
  const [userProfile, setUserProfile] = useState<UserProfileData>(() => {
    const stored = authService.getStoredUser();
    if (stored && stored.name) {
      return {
        ...CURRENT_USER,
        name: stored.name,
        username: stored.username ? `@${stored.username.replace('@', '')}` : CURRENT_USER.username,
        phone: stored.phone || CURRENT_USER.phone,
        about: stored.about || CURRENT_USER.about,
      };
    }
    return CURRENT_USER;
  });
  const [chats, setChats] = useState<ChatItem[]>(INITIAL_CHATS);
  const [recentChats] = useState<RecentChatUser[]>(RECENT_CHATS);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>(INITIAL_MESSAGES);
  const [activeChatId, setActiveChatId] = useState<string>('7'); // Default to '7' (Edward Lietz) as shown in reference image!
  const [groups, setGroups] = useState<GroupItem[]>(INITIAL_GROUPS);
  const [calls] = useState<CallLogItem[]>(INITIAL_CALLS);
  const [statusUpdates, setStatusUpdates] = useState<StatusItem[]>(INITIAL_STATUS_UPDATES);

  // Modals state
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [activeCall, setActiveCall] = useState<{ contactName: string; avatar?: string; type: 'audio' | 'video' } | null>(null);
  const [activeStory, setActiveStory] = useState<StatusItem | null>(null);

  // Active chat calculation
  const activeChat = useMemo(() => {
    return chats.find((c) => c.id === activeChatId) || chats[0] || null;
  }, [chats, activeChatId]);

  // Total unread count across all chats
  const totalUnread = useMemo(() => {
    return chats.reduce((acc, c) => acc + (c.unread || 0), 0);
  }, [chats]);

  // Theme toggle
  const toggleTheme = () => {
    setTheme((prev) => {
      const nextTheme = prev === 'light' ? 'dark' : 'light';
      if (nextTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return nextTheme;
    });
  };

  // Select chat handler
  const handleSelectChat = (id: string) => {
    setActiveChatId(id);
    setActiveTab('chats');
    // Clear unread on select
    setChats((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c))
    );
  };

  // Send message handler (Synced seamlessly with Home and ChatArea!)
  const handleSendMessage = (text: string, type: string = 'text', meta: Record<string, unknown> = {}) => {
    if (!text.trim()) return;

    const now = new Date();
    const hours = String(now.getHours() % 12 || 12).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
    const currentTime = `${hours}:${minutes} ${ampm}`;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'me',
      senderName: 'You',
      type: (type as ChatMessage['type']) || 'text',
      text: text,
      time: currentTime,
      status: 'read',
      ...meta
    };

    // Update messages for current active chat
    setMessages((prev) => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] || []), newMsg]
    }));

    // Update chat list last message, time, and bring to top
    setChats((prevChats) => {
      const updated = prevChats.map((c) => {
        if (c.id === activeChatId) {
          return {
            ...c,
            lastMessage: type === 'document' ? (meta.fileName as string || 'Document') : text,
            mediaType: type === 'photo' ? 'photo' : type === 'document' ? 'document' : undefined,
            time: currentTime,
            unread: 0
          };
        }
        return c;
      });

      // Move active chat to top
      const currentChatIndex = updated.findIndex((c) => c.id === activeChatId);
      if (currentChatIndex > -1) {
        const [currentChat] = updated.splice(currentChatIndex, 1);
        return [currentChat, ...updated];
      }
      return updated;
    });
  };

  // Add new contact and start chat
  const handleCreateNewContact = (contactName: string) => {
    const newId = `chat-${Date.now()}`;
    const newChat: ChatItem = {
      id: newId,
      name: contactName,
      initials: contactName.slice(0, 2).toUpperCase(),
      avatarBg: '#6366f1',
      lastMessage: 'Conversation started',
      time: 'Just now',
      unread: 0,
      online: true,
      statusText: 'Available'
    };

    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(newId);
    setActiveTab('chats');
  };

  // Create new group
  const handleCreateGroup = (newGroup: Omit<GroupItem, 'id'>) => {
    const newId = `grp-${Date.now()}`;
    const fullGroup: GroupItem = {
      ...newGroup,
      id: newId
    };
    setGroups((prev) => [fullGroup, ...prev]);

    // Also add to chat list
    const newGroupChat: ChatItem = {
      id: `chat-${newId}`,
      name: newGroup.name,
      initials: newGroup.initials,
      avatarBg: newGroup.avatarBg,
      lastMessage: 'Group created',
      time: 'Just now',
      unread: 0,
      isGroup: true,
      online: true,
      groupMembers: 'You, ' + newGroup.members.map((m) => m.name).join(', ')
    };
    setChats((prev) => [newGroupChat, ...prev]);
  };

  // Logout handler
  const handleLogout = () => {
    authService.logout();
    if (onLogout) onLogout();
  };

  return (
    <div className={`cs-app ${theme}`}>
      {/* 1. Leftmost Vertical Navigation Rail */}
      <SidebarRail
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalUnread={totalUnread}
        onLogout={handleLogout}
        onOpenProfile={() => setActiveTab('settings')}
        userAvatar={userProfile.avatar}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      {/* 2. Middle & Right Main Canvas by Active Tab */}
      {activeTab === 'chats' && (
        <>
          {/* Middle Conversation Sidebar */}
          <ChatList
            chats={chats}
            recentChats={recentChats}
            activeChatId={activeChatId}
            onSelectChat={handleSelectChat}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onNewChat={() => setShowNewChatModal(true)}
            onSelectRecentUser={(user) => {
              if (user.chatId) handleSelectChat(user.chatId);
            }}
          />

          {/* Right Active Chat Area */}
          <ChatArea
            activeChat={activeChat}
            messages={messages[activeChatId] || []}
            onSendMessage={handleSendMessage}
            currentUser={{
              id: 'user-me',
              name: userProfile.name,
              avatar: userProfile.avatar
            }}
            onStartCall={(type) => {
              if (activeChat) {
                handleStartCall(activeChat.name, type, activeChat.avatar);
              }
            }}
            onOpenDetails={() => setActiveTab('settings')}
          />
        </>
      )}

      {/* 3. Groups Section View */}
      {activeTab === 'groups' && (
        <GroupsSection
          groups={groups}
          onSelectGroupChat={(chatId) => {
            handleSelectChat(chatId);
            setActiveTab('chats');
          }}
          onCreateGroup={handleCreateGroup}
        />
      )}

      {/* 4. Calls Section View */}
      {activeTab === 'calls' && (
        <CallsSection
          calls={calls}
          onStartCall={(name, type, avatar) => handleStartCall(name, type, avatar)}
        />
      )}

      {/* 5. Status & Stories Section View */}
      {activeTab === 'status' && (
        <StatusSection
          statusUpdates={statusUpdates}
          onViewStory={(story) => setActiveStory(story)}
          onAddStory={() => {
            const newStatus: StatusItem = {
              id: `st-${Date.now()}`,
              userName: 'You',
              time: 'Just now',
              avatar: userProfile.avatar,
              isMe: true,
              hasStory: true,
              caption: 'Building beautiful real-time chat experiences ⚡'
            };
            setStatusUpdates((prev) => [newStatus, ...prev]);
            setActiveStory(newStatus);
          }}
        />
      )}

      {/* 6. Settings & Profile Section View */}
      {(activeTab === 'settings' || activeTab === 'profile') && (
        <SettingsSection
          user={userProfile}
          onUpdateProfile={(updated) => {
            setUserProfile((prev) => ({ ...prev, ...updated }));
          }}
          theme={theme}
          onToggleTheme={toggleTheme}
          onLogout={handleLogout}
        />
      )}

      {/* Contacts view alias */}
      {activeTab === 'contacts' && (
        <ChatList
          chats={chats}
          recentChats={recentChats}
          activeChatId={activeChatId}
          onSelectChat={handleSelectChat}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onNewChat={() => setShowNewChatModal(true)}
        />
      )}

      {/* 7. Modals */}
      {showNewChatModal && (
        <NewChatModal
          contacts={chats}
          onSelectContact={handleSelectChat}
          onClose={() => setShowNewChatModal(false)}
          onCreateNewContact={handleCreateNewContact}
        />
      )}

      {activeCall && (
        <CallModal
          contactName={activeCall.contactName}
          avatar={activeCall.avatar}
          type={activeCall.type}
          onEndCall={() => setActiveCall(null)}
        />
      )}

      {activeStory && (
        <StoryViewerModal
          story={activeStory}
          onClose={() => setActiveStory(null)}
        />
      )}
    </div>
  );
};

export default Home;
