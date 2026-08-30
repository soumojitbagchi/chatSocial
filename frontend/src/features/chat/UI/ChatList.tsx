import React, { useState } from 'react';
import {
  Search,
  Plus,
  MoreVertical,
  SlidersHorizontal,
  Pin,
  CheckCheck,
  Image as ImageIcon,
  Video,
  FileText,
  X,
  UserPlus,
  Users,
  Archive,
  MessageSquare
} from 'lucide-react';
import '../style/components.css';

export interface ChatItem {
  id: string;
  name: string;
  avatar?: string;
  initials?: string;
  avatarBg?: string;
  lastMessage: string;
  isTyping?: boolean;
  mediaType?: 'photo' | 'video-call' | 'audio-call' | 'document' | 'voice';
  time: string;
  pinned?: boolean;
  unread?: number;
  online?: boolean;
  status?: string;
  statusText?: string;
  isGroup?: boolean;
  groupMembers?: string;
  targetUserId?: string;
  isAdmin?: boolean;
}

export interface RecentChatUser {
  id: string;
  targetUserId?: string;
  name: string;
  fullName: string;
  avatar?: string;
  initials?: string;
  avatarBg?: string;
  online?: boolean;
  chatId?: string;
}
export interface ChatListProps {
  title?: string;
  chats: ChatItem[];
  recentChats: RecentChatUser[];
  activeChatId: string;
  onSelectChat: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onNewChat: () => void;
  onSelectRecentUser?: (user: RecentChatUser) => void;
  isUserOnline?: (userId?: string) => boolean;
  onDeleteChat?: (chatId: string) => void;
}

export const ChatList: React.FC<ChatListProps> = ({
  title = 'Chats',
  chats,
  recentChats,
  activeChatId,
  onSelectChat,
  searchQuery,
  setSearchQuery,
  onNewChat,
  onSelectRecentUser,
  isUserOnline,
  onDeleteChat: _onDeleteChat
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'groups' | 'pinned'>('all');
  const [showMenu, setShowMenu] = useState(false);

  const filteredChats = chats.filter((chat) => {
    const matchesSearch =
      searchQuery.trim() === '' ||
      chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilter === 'unread') return (chat.unread || 0) > 0;
    if (activeFilter === 'groups') return Boolean(chat.isGroup);
    if (activeFilter === 'pinned') return Boolean(chat.pinned);

    return true;
  });

  return (
    <section className="cs-chat-sidebar" aria-label="Chats and Contacts">
      <div className="cs-sidebar-header">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {title}
          </h2>

          <div className="flex items-center gap-2">
            <button
              onClick={onNewChat}
              className="w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 flex items-center justify-center shadow-sm transition-transform active:scale-95 cursor-pointer"
              title="New Chat"
              aria-label="New Chat"
            >
              <Plus size={18} strokeWidth={2.5} />
            </button>

            <div className="relative">
              <button
                onClick={() => setShowMenu((prev) => !prev)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="More Options"
                aria-label="More Options"
              >
                <MoreVertical size={18} />
              </button>

              {showMenu && (
                <div
                  className="absolute right-0 mt-2 w-48 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                  onClick={() => setShowMenu(false)}
                >
                  <button
                    className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer"
                    onClick={onNewChat}
                  >
                    <UserPlus size={15} className="text-slate-400" />
                    <span>New Contact</span>
                  </button>
                  <button
                    className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer"
                    onClick={onNewChat}
                  >
                    <Users size={15} className="text-slate-400" />
                    <span>New Group</span>
                  </button>
                  <button className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer">
                    <Archive size={15} className="text-slate-400" />
                    <span>Archived Chats</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="relative mt-3.5">
          <input
            type="text"
            placeholder="Search For Contacts or Messages"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-4 pr-10 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 transition-all shadow-2xs"
          />
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="pointer-events-auto hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={16} />
              </button>
            ) : (
              <Search size={16} />
            )}
          </div>
        </div>
      </div>

      <div className="cs-sidebar-scroll">
        <div className="cs-recent-section">
          <div className="flex items-center justify-between px-4 mb-2.5">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 tracking-tight">
              Recent Chats
            </span>
            <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 cursor-pointer">
              <MoreVertical size={14} />
            </button>
          </div>

          <div className="cs-recent-row">
            {recentChats.map((user) => {
              const isOnline = isUserOnline ? ((user.targetUserId ? isUserOnline(user.targetUserId) : false) || (user.chatId ? isUserOnline(user.chatId) : false) || isUserOnline(user.id)) : Boolean(user.online);
              return (
                <button
                  key={user.id}
                  onClick={() => {
                    if (user.chatId) onSelectChat(user.chatId);
                    else if (onSelectRecentUser) onSelectRecentUser(user);
                  }}
                  className="cs-recent-item group"

                  title={user.fullName}
                >
                  <div className="relative">
                    <div className="w-13 h-13 rounded-full overflow-hidden ring-2 ring-slate-200 dark:ring-slate-700 group-hover:ring-slate-400 transition-all shadow-xs bg-slate-200 dark:bg-slate-800">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center font-bold text-white text-sm rounded-full"
                          style={{ backgroundColor: user.avatarBg || '#475569' }}
                        >
                          {user.initials || (user.name ? user.name.slice(0, 2).toUpperCase() : 'U')}
                        </div>
                      )}
                    </div>
                    {isOnline && (
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 z-10" />
                    )}
                  </div>
                  <span className="cs-recent-name">
                    {user.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="cs-all-chats-section">
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 tracking-tight">
              All Chats
            </span>
            <button
              onClick={() => {
                setActiveFilter((prev) => {
                  if (prev === 'all') return 'unread';
                  if (prev === 'unread') return 'groups';
                  if (prev === 'groups') return 'pinned';
                  return 'all';
                });
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 cursor-pointer"
              title={`Filter: ${activeFilter}`}
            >
              <SlidersHorizontal size={14} />
            </button>
          </div>

          <div className="flex items-center gap-1.5 px-4 mb-2 overflow-x-auto no-scrollbar">
            <button
              className={`cs-chip ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              All
            </button>
            <button
              className={`cs-chip ${activeFilter === 'unread' ? 'active' : ''}`}
              onClick={() => setActiveFilter('unread')}
            >
              Unread
            </button>
            <button
              className={`cs-chip ${activeFilter === 'groups' ? 'active' : ''}`}
              onClick={() => setActiveFilter('groups')}
            >
              Groups
            </button>
            <button
              className={`cs-chip ${activeFilter === 'pinned' ? 'active' : ''}`}
              onClick={() => setActiveFilter('pinned')}
            >
              Pinned
            </button>
          </div>

          <div className="cs-chat-rows">
            {filteredChats.length === 0 ? (
              <div className="text-center py-10 px-4 space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 mx-auto flex items-center justify-center">
                  <MessageSquare size={18} />
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No rooms or chats yet</p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">Create a new room on the server to start chatting!</p>
                <button
                  onClick={onNewChat}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-semibold shadow-sm cursor-pointer"
                >
                  + Create Room
                </button>
              </div>
            ) : (
              filteredChats.map((chat) => {
                const isSelected = chat.id === activeChatId;
                const isOnline = isUserOnline ? ((chat.targetUserId ? isUserOnline(chat.targetUserId) : false) || isUserOnline(chat.id)) : Boolean(chat.online);

                return (
                  <div
                    key={chat.id}
                    className={`cs-chat-card ${isSelected ? 'active' : ''}`}
                    onClick={() => onSelectChat(chat.id)}
                    role="button"
                    tabIndex={0}
                  >
                    {isOnline && !chat.isGroup && (
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 z-10" />
                    )}
                    <div className="relative shrink-0 w-12 h-12 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 shadow-xs ring-1 ring-black/5 dark:ring-white/10">
                      {chat.avatar ? (
                        <img src={chat.avatar} alt={chat.name || 'Avatar'} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center font-bold text-white text-sm rounded-full"
                          style={{ backgroundColor: chat.avatarBg || '#475569' }}
                        >
                          {chat.initials || (chat.name ? chat.name.slice(0, 2).toUpperCase() : 'C')}
                        </div>
                      )}

                    </div>
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <h4 className="text-[13.5px] font-semibold text-slate-900 dark:text-white truncate">
                          {chat.name}
                        </h4>
                        <span className="text-[11px] font-medium text-slate-400 shrink-0 ml-2">
                          {chat.time}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-1">
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5">
                          {chat.isTyping ? (
                            <span className="text-slate-700 dark:text-slate-300 font-medium italic flex items-center gap-1">
                              <span>is typing</span>
                              <span className="cs-typing-dots">
                                <span />
                                <span />
                                <span />
                              </span>
                            </span>
                          ) : chat.mediaType === 'photo' ? (
                            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                              <ImageIcon size={13} className="text-slate-400" />
                              <span>Photo</span>
                            </span>
                          ) : chat.mediaType === 'video-call' ? (
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                              <Video size={13} />
                              <span>Incoming Video Call</span>
                            </span>
                          ) : chat.mediaType === 'document' ? (
                            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                              <FileText size={13} className="text-slate-400" />
                              <span>Document</span>
                            </span>
                          ) : (
                            <span className="truncate">{chat.lastMessage}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-1.5">
                          {chat.pinned && (
                            <Pin size={12} className="text-slate-400 rotate-45" />
                          )}

                          {(chat.unread || 0) > 0 ? (
                            <span className="cs-unread-pill">
                              {chat.unread}
                            </span>
                          ) : chat.status === 'read' ? (
                            <CheckCheck size={14} className="text-emerald-500" />
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ChatList;
