import React, { useState, useEffect, useCallback, useId } from 'react';
import { X, Search, UserPlus, MessageSquare, Check, Clock, Sparkles, AlertCircle } from 'lucide-react';
import { ChatItem } from './ChatList';
import { chatApi, UserProfileResult } from '../api/chatApi';
export interface NewChatModalProps {
  contacts: ChatItem[];
  onSelectContact: (id: string) => void;
  onClose: () => void;
  onSelectUserProfile?: (user: UserProfileResult) => void;
  onCreateNewContact?: (name: string) => void;
  onRefreshChats?: () => Promise<void>;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  contacts,
  onSelectContact,
  onClose,
  onSelectUserProfile,
  onCreateNewContact,
  onRefreshChats
}) => {
  const [activeTab, setActiveTab] = useState<'discover' | 'custom'>('discover');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfileResult[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const searchInputId = useId();

  // Search users from backend database (debounced)
  const performSearch = useCallback(async (query: string) => {
    setIsLoadingUsers(true);
    try {
      const results = await chatApi.searchUsers(query);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(search);
    }, 250);

    return () => clearTimeout(timer);
  }, [search, performSearch]);

  // 1. Send connection invitation
  const handleSendRequest = async (targetUserId: string) => {
    setActionLoadingId(targetUserId);
    setFeedbackMessage(null);
    try {
      const res = await chatApi.sendConnectionRequest(targetUserId);
      setSearchResults((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, connectionStatus: 'pending_sent' } : u))
      );
      setFeedbackMessage(res.message || 'Connection request sent!');
      setTimeout(() => setFeedbackMessage(null), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send request';
      setFeedbackMessage(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  // 2. Accept incoming connection invitation
  const handleAcceptRequest = async (targetUserId: string) => {
    setActionLoadingId(targetUserId);
    setFeedbackMessage(null);
    try {
      const res = await chatApi.acceptConnectionRequest(targetUserId);
      setSearchResults((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, connectionStatus: 'connected', roomId: res.room?._id || res.room?.id } : u))
      );
      setFeedbackMessage(res.message || 'Connected!');

      if (onRefreshChats) {
        await onRefreshChats();
      }

      if (res.room?._id || res.room?.id) {
        onSelectContact(res.room._id || res.room.id);
        setTimeout(onClose, 400);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to accept request';
      setFeedbackMessage(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  // 3. Reject / remove connection invitation
  const handleRejectRequest = async (targetUserId: string) => {
    setActionLoadingId(targetUserId);
    try {
      await chatApi.rejectConnectionRequest(targetUserId);
      setSearchResults((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, connectionStatus: 'none' } : u))
      );
    } catch {
      // Ignore
    } finally {
      setActionLoadingId(null);
    }
  };

  // 4. Open chat for user
  const handleOpenConnectedChat = (user: UserProfileResult) => {
    if (onSelectUserProfile) {
      onSelectUserProfile(user);
      onClose();
      return;
    }
    if (user.roomId) {
      onSelectContact(user.roomId);
      onClose();
    } else {
      const matchingChat = contacts.find((c) => c.id === user.id || c.name.toLowerCase() === user.name.toLowerCase() || c.targetUserId === user.id);
      if (matchingChat) {
        onSelectContact(matchingChat.id);
      } else if (onCreateNewContact) {
        onCreateNewContact(user.name);
      }
      onClose();
    }
  };

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    if (onCreateNewContact) {
      onCreateNewContact(customName.trim());
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[88vh] text-slate-900 dark:text-white">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold">
              <Sparkles size={15} />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Connect with Users</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Discover and message registered people</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Close"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="relative">
            <label htmlFor={searchInputId} className="sr-only">Search registered users</label>
            <input
              id={searchInputId}
              type="text"
              placeholder="Search by name, @username, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 shadow-sm"
              autoFocus
            />
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            {isLoadingUsers && (
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-slate-900 dark:border-white border-t-transparent animate-spin" />
            )}
          </div>
        </div>

        {/* Feedback Message */}
        {feedbackMessage && (
          <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* User Profiles List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {searchResults.length === 0 && !isLoadingUsers ? (
            <div className="text-center py-10 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Search size={20} />
              </div>
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">No users found</h4>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Try searching with a different username or full name.
              </p>
            </div>
          ) : (
            searchResults.map((user) => {
              const isActionLoading = actionLoadingId === user.id;

              return (
                <div
                  key={user.id}
                  className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer hover:opacity-90 transition-opacity" onClick={() => handleOpenConnectedChat(user)} title={`Open chat with ${user.name}`}>
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-white text-sm shadow-sm" style={{ backgroundColor: '#475569' }}>
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{user.name.slice(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                      {user.online && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                      )}
                    </div>

                    {/* Meta */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.name}</h4>
                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
                          @{user.username}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {user.about || user.email}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0 flex items-center gap-1.5">
                    {user.connectionStatus === 'connected' ? (
                      <button
                        type="button"
                        onClick={() => handleOpenConnectedChat(user)}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      >
                        <MessageSquare size={13} />
                        <span>Chat</span>
                      </button>
                    ) : user.connectionStatus === 'pending_sent' ? (
                      <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700">
                        <Clock size={13} className="text-amber-500" />
                        <span>Requested</span>
                      </span>
                    ) : user.connectionStatus === 'pending_received' ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={isActionLoading}
                          onClick={() => handleAcceptRequest(user.id)}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          title="Accept invitation"
                        >
                          <Check size={13} />
                          <span>Accept</span>
                        </button>
                        <button
                          type="button"
                          disabled={isActionLoading}
                          onClick={() => handleRejectRequest(user.id)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          title="Decline"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isActionLoading}
                        onClick={() => handleSendRequest(user.id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                      >
                        <UserPlus size={13} />
                        <span>{isActionLoading ? 'Sending...' : 'Connect'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Custom Creation */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between text-xs">
          {activeTab === 'discover' ? (
            <button
              type="button"
              onClick={() => setActiveTab('custom')}
              className="text-slate-700 dark:text-slate-300 font-semibold hover:underline cursor-pointer flex items-center gap-1"
            >
              <UserPlus size={14} />
              <span>Or create custom channel by name</span>
            </button>
          ) : (
            <form onSubmit={handleCreateCustom} className="w-full flex items-center gap-2">
              <input
                type="text"
                autoFocus
                placeholder="Channel/group name..."
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="flex-1 h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 cursor-pointer"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('discover')}
                className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                Back
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewChatModal;
