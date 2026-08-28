import React, { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import SidebarRail from './SidebarRail';
import ChatList from './ChatList';
import ChatArea from './ChatArea';
import GroupsSection from './GroupsSection';
import CallsSection from './CallsSection';
import StatusSection from './StatusSection';
import SettingsSection from './SettingsSection';
import NewChatModal from './NewChatModal';
import CallModal from './CallModal';
import StoryViewerModal from './StoryViewerModal';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import { useChatContext } from '../hooks/useChatContext';
import '../style/components.css';

export interface HomeProps {
  onLogout?: () => void;
}

export const Home: React.FC<HomeProps> = ({ onLogout }) => {
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const { user, logout, updateProfile } = useAuthContext();
  const {
    activeTab,
    setActiveTab,
    theme,
    toggleTheme,
    showNewChatModal,
    setShowNewChatModal,
    totalUnread,
    chat,
    groups,
    calls,
    status,
  } = useChatContext();

  // Automatically fetch fresh backend data whenever user enters the chat screen or switches tabs
  useEffect(() => {
    if (activeTab === 'chats' || activeTab === 'contacts') {
      chat.fetchBackendRooms();
      if (chat.activeChatId) {
        chat.loadBackendMessages(chat.activeChatId);
      }
    } else if (activeTab === 'groups') {
      groups.fetchBackendRooms();
    }
  }, [activeTab, chat, groups]);

  const handleLogout = () => {
    logout();
    if (onLogout) onLogout();
  };

  const userProfile = {
    name: user?.name || 'Soumojit Bagchi',
    username: user?.username ? `@${user.username.replace('@', '')}` : '@bagchi10',
    avatar: user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    phone: user?.phone || '+1 (555) 234-5678',
    about: user?.about || 'Usually around. Say hello.',
  };

  return (
    <div className={`cs-app ${theme} ${mobileChatOpen ? 'conversation-open' : ''}`}>
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
            chats={chat.chats}
            recentChats={chat.recentChats}
            activeChatId={chat.activeChatId}
            onSelectChat={(chatId) => {
              chat.selectChat(chatId);
              setMobileChatOpen(true);
            }}
            searchQuery={chat.searchQuery}
            setSearchQuery={chat.setSearchQuery}
            onNewChat={() => setShowNewChatModal(true)}
            onSelectRecentUser={(recentUser) => {
              if (recentUser.chatId) {
                chat.selectChat(recentUser.chatId);
                setMobileChatOpen(true);
              }
            }}
          />

          {/* Right Active Chat Area */}
          <ChatArea
            activeChat={chat.activeChat}
            messages={chat.activeMessages}
            onSendMessage={chat.sendMessage}
            currentUser={{
              id: user?.id || user?._id || 'user-me',
              name: userProfile.name,
              avatar: userProfile.avatar,
            }}
            onStartCall={(callType) => {
              if (chat.activeChat) {
                calls.startCall(chat.activeChat.name, callType, chat.activeChat.avatar);
              }
            }}
            onOpenDetails={() => setActiveTab('settings')}
            onBack={() => setMobileChatOpen(false)}
            onNewChat={() => setShowNewChatModal(true)}
          />
        </>
      )}

      {/* 3. Groups Section View */}
      {activeTab === 'groups' && (
        <GroupsSection
          groups={groups.groups}
          onSelectGroupChat={(chatId) => {
            chat.selectChat(chatId);
            setActiveTab('chats');
          }}
          onCreateGroup={groups.createGroup}
        />
      )}

      {/* 4. Calls Section View */}
      {activeTab === 'calls' && (
        <CallsSection
          calls={calls.calls}
          onStartCall={(name, callType, avatar) => calls.startCall(name, callType, avatar)}
        />
      )}

      {/* 5. Status & Stories Section View */}
      {activeTab === 'status' && (
        <StatusSection
          statusUpdates={status.statusUpdates}
          onViewStory={status.viewStory}
          onAddStory={() => status.addStory()}
        />
      )}

      {/* 6. Settings & Profile Section View */}
      {(activeTab === 'settings' || activeTab === 'profile') && (
        <SettingsSection
          user={userProfile}
          onUpdateProfile={updateProfile}
          theme={theme}
          onToggleTheme={toggleTheme}
          onLogout={handleLogout}
        />
      )}

      {/* Contacts view alias */}
      {activeTab === 'contacts' && (
        <>
          <ChatList
            title="Contacts"
            chats={chat.chats}
            recentChats={chat.recentChats}
            activeChatId={chat.activeChatId}
            onSelectChat={(chatId) => {
              chat.selectChat(chatId);
              setActiveTab('chats');
              setMobileChatOpen(true);
            }}
            searchQuery={chat.searchQuery}
            setSearchQuery={chat.setSearchQuery}
            onNewChat={() => setShowNewChatModal(true)}
          />
          <main className="cs-conversation-empty">
            <div className="cs-empty-state">
              <User size={24} />
              <h3>Choose a contact</h3>
              <p>Select someone from the list to open a conversation.</p>
            </div>
          </main>
        </>
      )}

      {/* 7. Interactive Modals */}
      {showNewChatModal && (
        <NewChatModal
          contacts={chat.chats}
          onSelectContact={chat.selectChat}
          onClose={() => setShowNewChatModal(false)}
          onCreateNewContact={chat.createNewContact}
        />
      )}

      {calls.activeCall && (
        <CallModal
          contactName={calls.activeCall.contactName}
          avatar={calls.activeCall.avatar}
          type={calls.activeCall.type}
          status={calls.activeCall.status}
          statusMessage={calls.activeCall.statusMessage}
          direction={calls.activeCall.direction}
          isMuted={calls.activeCall.isMuted}
          isVideoOff={calls.activeCall.isVideoOff}
          localStream={calls.localStream}
          remoteStream={calls.remoteStream}
          onAcceptCall={calls.acceptCall}
          onRejectCall={calls.rejectCall}
          onEndCall={calls.endCall}
          onToggleMute={calls.toggleMute}
          onToggleVideo={calls.toggleVideo}
        />
      )}

      {status.activeStory && (
        <StoryViewerModal
          story={status.activeStory}
          onClose={status.closeStory}
        />
      )}
    </div>
  );
};

export default Home;
