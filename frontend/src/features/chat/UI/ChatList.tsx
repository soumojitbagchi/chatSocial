import React, { useState, useMemo } from 'react';
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
  MessageSquare,
  Trash2
} from 'lucide-react';

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
}

export interface RecentChatUser {
  id: string;
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
  isUserOnline?: (id?: string) => boolean;
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
  onDeleteChat,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'groups' | 'pinned'>('all');
  const [showMenu, setShowMenu] = useState(false);
  const [activeMenuChatId, setActiveMenuChatId] = useState<string | null>(null);
  // Filter chats by search query and selected filter
  const filteredChats = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return chats.filter((chat) => {
      const matchesSearch =
        q === '' ||
        chat.name.toLowerCase().includes(q) ||
        chat.lastMessage.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (activeFilter === 'unread') return (chat.unread || 0) > 0;
      if (activeFilter === 'groups') return Boolean(chat.isGroup);
      if (activeFilter === 'pinned') return Boolean(chat.pinned);
      return true;
    });
  }, [chats, searchQuery, activeFilter]);
  return (
    <section className="cs-chat-sidebar" aria-label="Chats and Contacts">
      {/* Top Header */}
      <div className="cs-sidebar-header">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {title}
          </h2>

          <div className="flex items-center gap-2">
            {/* New Chat Plus Button */}
            <button
              onClick={onNewChat}
              className="cs-primary-icon"
              title="New Chat"
              aria-label="New Chat"
            >
              <Plus size={18} strokeWidth={2.5} />
            </button>

            {/* 3-dots Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu((prev) => !prev)}
                className="cs-icon-button"
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
                    className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5"
                    onClick={onNewChat}
                  >
                    <UserPlus size={15} className="text-slate-400" />
                    <span>New Contact</span>
                  </button>
                  <button 
                    className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5"
                    onClick={onNewChat}
                  >
                    <Users size={15} className="text-slate-400" />
                    <span>New Group</span>
                  </button>
                  <button className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5">
                    <Archive size={15} className="text-slate-400" />
                    <span>Archived Chats</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search Bar matching screenshot */}
        <div className="relative mt-3.5">
          <input
            type="text"
            placeholder="Search conversations"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="cs-search-input"
          />
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {searchQuery ? (
              <button 
                type="button"
                onClick={() => setSearchQuery('')}
                className="pointer-events-auto hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            ) : (
              <Search size={16} />
            )}
          </div>
        </div>
      </div>

      {/* Scrollable Container */}
      <div className="cs-sidebar-scroll">
        {recentChats.length > 0 && (
          <div className="cs-recent-section">
            <div className="cs-section-heading">
              <span>Recent</span>
            </div>

            <div className="cs-recent-row">
              {recentChats.map((user) => {
                const isOnline = isUserOnline ? isUserOnline(user.chatId || user.id) : Boolean(user.online);
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
                      <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-transparent group-hover:ring-orange-400 transition-all shadow-sm">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center font-bold text-white text-sm"
                            style={{ backgroundColor: user.avatarBg || '#6f7771' }}
                          >
                            {user.initials || user.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                      )}
                    </div>
                    <span className="cs-recent-name">{user.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* All Chats Section */}
        <div className="cs-all-chats-section">
          <div className="cs-section-heading">
            <span>Conversations</span>
            <button 
              onClick={() => {
                setActiveFilter((prev) => {
                  if (prev === 'all') return 'unread';
                  if (prev === 'unread') return 'groups';
                  if (prev === 'groups') return 'pinned';
                  return 'all';
                });
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5"
              title={`Filter: ${activeFilter}`}
              aria-label={`Change chat filter. Current filter: ${activeFilter}`}
            >
              <SlidersHorizontal size={14} />
            </button>
          </div>

          {/* Filter Chips Bar */}
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

          {/* Chat List Rows */}
          <div className="cs-chat-rows">
            {filteredChats.length === 0 ? (
              <div className="cs-sidebar-empty">
                <MessageSquare size={20} />
                <h3>No conversations yet</h3>
                <p>Start a conversation and it will appear here.</p>
                <button
                  onClick={onNewChat}
                  className="cs-primary-button"
                >
                  Start a conversation
                </button>
              </div>
            ) : (
              filteredChats.map((chat) => {
                const isSelected = chat.id === activeChatId;
                const isOnline = chat.isGroup ? false : isUserOnline ? isUserOnline(chat.id) : Boolean(chat.online);

                return (
                  <div
                    key={chat.id}
                    role="button"
                    tabIndex={0}
                    className={`cs-chat-card ${isSelected ? 'active' : ''}`}
                    onClick={() => onSelectChat(chat.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectChat(chat.id);
                      }
                    }}
                  >
                    {/* Left Avatar with Online Dot */}
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-sm">
                        {chat.avatar ? (
                          <img src={chat.avatar} alt={chat.name} className="w-full h-full object-cover" />
                        ) : (
                          <div 
                            className="w-full h-full flex items-center justify-center font-bold text-white text-sm"
                            style={{ backgroundColor: chat.avatarBg || '#6f7771' }}
                          >
                            {chat.initials || chat.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                      )}
                    </div>

                    {/* Middle Content */}
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
                        {/* Subtitle / Last Message Preview */}
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5">
                          {chat.isTyping ? (
                            <span className="text-orange-600 dark:text-orange-400 font-medium italic flex items-center gap-1">
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

                        {/* Right Meta: Pin icon & Badge pill & 3-dots menu */}
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

                          {onDeleteChat && (
                            <div className="relative">
                              <button
                                type="button"
                                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                                title="Chat options"
                                aria-label="Chat options"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuChatId((prev) => (prev === chat.id ? null : chat.id));
                                }}
                              >
                                <MoreVertical size={13} />
                              </button>

                              {activeMenuChatId === chat.id && (
                                <div
                                  className="absolute right-0 top-full mt-1 w-36 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100 text-slate-700 dark:text-slate-200 text-xs font-medium"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    className="w-full px-3 py-1.5 text-left hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2 cursor-pointer"
                                    onClick={() => {
                                      onDeleteChat(chat.id);
                                      setActiveMenuChatId(null);
                                    }}
                                  >
                                    <Trash2 size={13} />
                                    <span>Delete Chat</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
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
