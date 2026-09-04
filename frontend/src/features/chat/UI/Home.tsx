import React, { useEffect, useState, useMemo, useCallback } from 'react';
import SidebarRail from './SidebarRail';
import ChatList from './ChatList';
import ChatArea from './ChatArea';
import GroupsSection from './GroupsSection';
import CallsSection from './CallsSection';
import StatusSection from './StatusSection';
import SettingsSection from './SettingsSection';
import NewChatModal from './NewChatModal';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import CallModal from './CallModal';
import StoryViewerModal from './StoryViewerModal';
import EditProfileModal from './EditProfileModal';
import ContactDetailsModal from './ContactDetailsModal';
import { useChatContext } from '../hooks/useChatContext';
import '../style/components.css';

export interface HomeProps {
  onLogout?: () => void;
}

export const Home: React.FC<HomeProps> = ({ onLogout }) => {
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showContactDetailsModal, setShowContactDetailsModal] = useState(false);
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
  const direct1to1Chats = useMemo(() => {
    return chat.chats.filter((c) => !c.isGroup);
  }, [chat.chats]);

  const contactListItems = useMemo(() => {
    const directChats = chat.chats.filter((c) => !c.isGroup);
    const seenUserIds = new Set<string>();
    directChats.forEach((c) => {
      if (c.targetUserId) seenUserIds.add(c.targetUserId);
    });

    const additionalContacts: typeof directChats = [];
    if (chat.connections && Array.isArray(chat.connections.contacts)) {
      chat.connections.contacts.forEach((u) => {
        if (!seenUserIds.has(u.id)) {
          seenUserIds.add(u.id);
          additionalContacts.push({
            id: u.roomId || u.id,
            targetUserId: u.id,
            name: u.name,
            initials: u.name ? u.name.slice(0, 2).toUpperCase() : 'U',
            avatar: u.avatar || '',
            avatarBg: '#475569',
            lastMessage: u.about || 'Connected contact',
            time: 'Connected',
            unread: 0,
            online: false,
            isGroup: false,
            statusText: u.about || 'Available on chatSocial',
          });
        }
      });
    }

    return [...directChats, ...additionalContacts];
  }, [chat.chats, chat.connections]);

  const handleSelectDirectUser = useCallback(
    async (targetUser: { id?: string; name: string; username?: string; avatar?: string; about?: string; roomId?: string | null }) => {
      const targetUserId = targetUser.id ? String(targetUser.id) : '';
      const currentUserId = user?.id || user?._id || '';

      const existingChat = chat.chats.find(
        (c) => !c.isGroup && (c.targetUserId === targetUserId || (targetUser.roomId && c.id === targetUser.roomId))
      );
      if (existingChat) {
        chat.selectChat(existingChat.id);
        setActiveTab('chats');
        setMobileChatOpen(true);
        return;
      }

      if (targetUser.roomId) {
        chat.selectChat(targetUser.roomId);
        setActiveTab('chats');
        setMobileChatOpen(true);
        return;
      }

      if (targetUserId && currentUserId) {
        try {
          const directRoomName = `direct_${[currentUserId.toString(), targetUserId].sort().join('_')}`;
          const room = await chatApi.createRoom({
            roomname: directRoomName,
            description: `Direct conversation with ${targetUser.name || 'User'}`,
            isPrivate: true,
            members: [currentUserId.toString(), targetUserId],
            avatar: targetUser.avatar || '',
          });
          const validRoomId = room._id || room.id;
          await chat.fetchBackendRooms();
          if (validRoomId) {
            chat.selectChat(validRoomId);
          }
        } catch {
          if (targetUser.name) {
            await chat.createNewContact(targetUser.name);
          }
        }
      } else if (targetUser.name) {
        await chat.createNewContact(targetUser.name);
      }

      setActiveTab('chats');
      setMobileChatOpen(true);
    },
    [chat, setActiveTab, user]
  );
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
      <SidebarRail
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalUnread={totalUnread}
        onOpenProfile={() => setShowEditProfileModal(true)}
        userAvatar={userProfile.avatar}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {activeTab === 'chats' && (
        <>
          <ChatList
            chats={direct1to1Chats}
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
            pendingIncomingCount={chat.connections?.pendingIncoming?.length || 0}
            pendingIncomingRequests={chat.connections?.pendingIncoming || []}
            onAcceptRequest={chat.acceptConnectionRequest}
            onRejectRequest={chat.rejectConnectionRequest}
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
            onOpenDetails={() => setShowContactDetailsModal(true)}
            onBack={() => setMobileChatOpen(false)}
            onNewChat={() => setShowNewChatModal(true)}
            isOnline={isUserOnline ? ((chat.activeChat?.targetUserId ? isUserOnline(chat.activeChat.targetUserId) : false) || isUserOnline(chat.activeChat?.id)) : false}
            onDeleteMessage={chat.deleteMessage}
            onDeleteChat={chat.deleteChat}
            onLoadMoreMessages={chat.loadMoreMessages}
            hasMoreMessages={chat.hasMoreMessages}
            isLoadingMore={chat.isLoadingMore}
          />
        </>
      )}

      {activeTab === 'groups' && (
        <GroupsSection
          groups={groups.groups}
          contacts={chat.chats}
          onSelectGroupChat={(chatId) => {
            chat.selectChat(chatId);
            setActiveTab('chats');
          }}
          onSelectUser={handleSelectDirectUser}
          onCreateGroup={groups.createGroup}
          onAddMember={groups.addMember}
          onRemoveMember={groups.removeMember}
          onUpdateGroupInfo={groups.updateGroupInfo}
        />
      )}

      {activeTab === 'calls' && (
        <CallsSection
          calls={calls.calls}
          missedCalls={calls.missedCalls}
          unseenMissedCount={calls.unseenMissedCount}
          onMarkMissedSeen={calls.markMissedSeen}
          onStartCall={(name, callType, avatar) => {
            const foundChat = chat.chats.find((c) => c.name.toLowerCase() === name.toLowerCase() || c.id === name || c.targetUserId === name);
            const contactId = foundChat?.targetUserId || foundChat?.id || name;
            calls.startCall(contactId, name, callType, avatar);
          }}
        />
      )}

      {activeTab === 'status' && (
        <StatusSection
          myStatus={status.myStatus}
          recentUpdates={status.recentUpdates}
          viewedUpdates={status.viewedUpdates}
          onOpenDeck={status.openStoryDeck}
          onCreateStory={status.createStory}
          onDeleteStory={status.deleteStory}
          currentUserAvatar={userProfile.avatar}
          currentUserName={userProfile.name}
          isUploading={status.isUploading}
        />
      )}

      {(activeTab === 'settings' || activeTab === 'profile') && (
        <SettingsSection
          user={userProfile}
          onUpdateProfile={updateProfile}
          theme={theme}
          onToggleTheme={toggleTheme}
          onLogout={handleLogout}
        />
      )}

      {activeTab === 'contacts' && (
        <>
          <ChatList
            title="Contacts"
            chats={contactListItems}
            recentChats={chat.recentChats}
            activeChatId={chat.activeChatId}
            onSelectChat={(chatId) => {
              const selectedContact = contactListItems.find((c) => c.id === chatId || c.targetUserId === chatId);
              if (selectedContact && selectedContact.id && selectedContact.id !== selectedContact.targetUserId) {
                chat.selectChat(selectedContact.id);
              } else {
                chat.selectChat(chatId);
              }
              setActiveTab('chats');
              setMobileChatOpen(true);
            }}
            searchQuery={chat.searchQuery}
            setSearchQuery={chat.setSearchQuery}
            onNewChat={() => setShowNewChatModal(true)}
            onSelectRecentUser={(recentUser) => {
              if (recentUser.chatId) {
                chat.selectChat(recentUser.chatId);
                setActiveTab('chats');
                setMobileChatOpen(true);
              }
            }}
            isUserOnline={isUserOnline}
            onDeleteChat={chat.deleteChat}
            pendingIncomingCount={chat.connections?.pendingIncoming?.length || 0}
            pendingIncomingRequests={chat.connections?.pendingIncoming || []}
            onAcceptRequest={chat.acceptConnectionRequest}
            onRejectRequest={chat.rejectConnectionRequest}
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
            onOpenDetails={() => setShowContactDetailsModal(true)}
            onNewChat={() => setShowNewChatModal(true)}
            isOnline={isUserOnline ? ((chat.activeChat?.targetUserId ? isUserOnline(chat.activeChat.targetUserId) : false) || isUserOnline(chat.activeChat?.id)) : false}
            onDeleteMessage={chat.deleteMessage}
            onDeleteChat={chat.deleteChat}
            onLoadMoreMessages={chat.loadMoreMessages}
            hasMoreMessages={chat.hasMoreMessages}
            isLoadingMore={chat.isLoadingMore}
          />
        </>
      )}

      {showNewChatModal && (
        <NewChatModal
          contacts={chat.chats}
          onSelectContact={chat.selectChat}
          onSelectUserProfile={handleSelectDirectUser}
          onClose={() => setShowNewChatModal(false)}
          onCreateNewContact={chat.createNewContact}
          onRefreshChats={chat.fetchBackendRooms}
          pendingIncomingRequests={chat.connections?.pendingIncoming || []}
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
          remoteStreams={calls.remoteStreams}
          peerNames={calls.peerNames}
          sfu={calls.activeCall.sfu}
          onAcceptCall={calls.acceptCall}
          onRejectCall={calls.rejectCall}
          onEndCall={calls.endCall}
          onToggleMute={calls.toggleMute}
          onToggleVideo={calls.toggleVideo}
          onInvitePeer={calls.invitePeer}
        />
      )}

      {status.activeUserDeck && (
        <StoryViewerModal
          deck={status.activeUserDeck}
          activeSlideIndex={status.activeSlideIndex}
          onClose={status.closeStoryDeck}
          onNextSlide={status.nextSlide}
          onPrevSlide={status.prevSlide}
          onNextDeck={status.nextUserDeck}
          onPrevDeck={status.prevUserDeck}
          onDeleteStory={status.deleteStory}
          onReply={async (statusId, text) => {
            const res = await status.replyToStory(statusId, text);
            if (res?.roomId) {
              chat.selectChat(res.roomId);
            }
          }}
          onSelectChat={(roomId) => {
            chat.selectChat(roomId);
            setActiveTab('chats');
            setMobileChatOpen(true);
          }}
        />
      )}

      {showEditProfileModal && (
        <EditProfileModal
          isOpen={showEditProfileModal}
          onClose={() => setShowEditProfileModal(false)}
          user={userProfile}
          onSave={async (updated) => {
            await updateProfile(updated);
          }}
        />
      )}

      {showContactDetailsModal && chat.activeChat && (
        <ContactDetailsModal
          isOpen={showContactDetailsModal}
          onClose={() => setShowContactDetailsModal(false)}
          contact={chat.activeChat}
          contacts={chat.chats}
          isOnline={isUserOnline ? ((chat.activeChat.targetUserId ? isUserOnline(chat.activeChat.targetUserId) : false) || isUserOnline(chat.activeChat.id)) : false}
          onStartCall={(callType) => {
            const targetId = chat.activeChat?.targetUserId || chat.activeChat?.id;
            if (targetId && chat.activeChat) {
              calls.startCall(targetId, chat.activeChat.name, callType, chat.activeChat.avatar);
            }
          }}
          onDeleteChat={chat.deleteChat}
          onSelectUser={handleSelectDirectUser}
          onAddMember={groups.addMember}
          onRemoveMember={groups.removeMember}
          onUpdateGroupInfo={groups.updateGroupInfo}
        />
      )}
    </div>
  );
};

export default Home;
