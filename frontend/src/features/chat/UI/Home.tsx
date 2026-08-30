import React, { useEffect, useState } from 'react';
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
    socket,
    chat,
    groups,
    calls,
    status,
  } = useChatContext();
  // Fetch fresh backend data only when switching to specific tabs
  const { fetchBackendRooms: fetchRooms, loadBackendMessages: loadMsgs, activeChatId } = chat;
  const { fetchBackendRooms: fetchGroupRooms } = groups;

  useEffect(() => {
    if (activeTab === 'chats' || activeTab === 'contacts') {
      fetchRooms();
      if (activeChatId) {
        loadMsgs(activeChatId);
      }
    } else if (activeTab === 'groups') {
      fetchGroupRooms();
    }
  }, [activeTab, fetchRooms, loadMsgs, activeChatId, fetchGroupRooms]);

  const isUserOnline = (userId?: string) => Boolean(userId && socket?.onlineUsers?.includes(userId));

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
            isUserOnline={isUserOnline}
            onDeleteChat={chat.deleteChat}
          />
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
                const targetId = chat.activeChat.targetUserId || chat.activeChat.id;
                calls.startCall(targetId, chat.activeChat.name, callType, chat.activeChat.avatar);
              }
            }}
            onOpenDetails={() => setActiveTab('settings')}
            onBack={() => setMobileChatOpen(false)}
            onNewChat={() => setShowNewChatModal(true)}
            isOnline={isUserOnline ? isUserOnline(chat.activeChat?.id) : false}
            onDeleteMessage={chat.deleteMessage}
            onDeleteChat={chat.deleteChat}
            onLoadMoreMessages={chat.loadMoreMessages}
            hasMoreMessages={chat.hasMoreMessages}
            isLoadingMore={chat.isLoadingMore}
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
          onStartCall={(name, callType, avatar) => {
            const foundChat = chat.chats.find((c) => c.name.toLowerCase() === name.toLowerCase() || c.id === name || c.targetUserId === name);
            const contactId = foundChat?.targetUserId || foundChat?.id || name;
            calls.startCall(contactId, name, callType, avatar);
          }}
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

            }}
            searchQuery={chat.searchQuery}
            setSearchQuery={chat.setSearchQuery}
            onNewChat={() => setShowNewChatModal(true)}
            onSelectRecentUser={(recentUser) => {
              if (recentUser.chatId) {
                chat.selectChat(recentUser.chatId);
                setActiveTab('chats');
              }
            }}
            isUserOnline={isUserOnline}
            onDeleteChat={chat.deleteChat}
          />

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
                const targetId = chat.activeChat.targetUserId || chat.activeChat.id;
                calls.startCall(targetId, chat.activeChat.name, callType, chat.activeChat.avatar);
              }
            }}
            onOpenDetails={() => setActiveTab('settings')}
            onNewChat={() => setShowNewChatModal(true)}
            isOnline={isUserOnline ? isUserOnline(chat.activeChat?.id) : false}
            onDeleteMessage={chat.deleteMessage}
            onDeleteChat={chat.deleteChat}
            onLoadMoreMessages={chat.loadMoreMessages}
            hasMoreMessages={chat.hasMoreMessages}
            isLoadingMore={chat.isLoadingMore}
          />
        </>
      )}

      {/* 7. Interactive Modals */}
      {showNewChatModal && (
        <NewChatModal
          contacts={chat.chats}
          onSelectContact={chat.selectChat}
          onClose={() => setShowNewChatModal(false)}
          onCreateNewContact={chat.createNewContact}
          onRefreshChats={chat.fetchBackendRooms}
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
