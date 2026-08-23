import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  MessageSquarePlus, 
  MoreVertical, 
  BellOff, 
  X, 
  Archive, 
  Pin, 
  VolumeX, 
  CheckCheck, 
  Phone, 
  Video, 
  Plus, 
  CircleDashed, 
  Megaphone, 
  Settings, 
  Star, 
  Users, 
  Check, 
  PhoneIncoming, 
  PhoneOutgoing, 
  PhoneMissed, 
  Link2,
  Camera
} from 'lucide-react';
import Chat from './Chat';
import '../style/components.css';

const Home = ({
  activeTab,
  setActiveTab,
  chats,
  setChats,
  activeChatId,
  setActiveChatId,
  messages,
  onSendMessage,
  searchQuery,
  setSearchQuery,
  statusUpdates,
  channels,
  callLogs
}) => {
  const [filterType, setFilterType] = useState('all');
  const [showAlertBanner, setShowAlertBanner] = useState(true);
  const [activeStory, setActiveStory] = useState(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [followingChannels, setFollowingChannels] = useState({
    'ch-1': true,
    'ch-2': true
  });

  // Calculate unread counts for chips
  const unreadCount = useMemo(() => {
    return chats.reduce((sum, chat) => sum + (chat.unread || 0), 0);
  }, [chats]);

  const groupCount = useMemo(() => {
    return chats.filter((c) => c.isGroup).length;
  }, [chats]);

  // Filter chats by search query and active filter chip
  const filteredChats = useMemo(() => {
    return chats.filter((chat) => {
      // Search matching
      const matchesSearch = searchQuery.trim() === '' || 
        chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;

      // Chip matching
      if (filterType === 'unread') return chat.unread > 0;
      if (filterType === 'favourites') return chat.pinned;
      if (filterType === 'groups') return chat.isGroup;
      return true;
    });
  }, [chats, searchQuery, filterType]);

  const activeChat = useMemo(() => {
    return chats.find((c) => c.id === activeChatId) || chats[0];
  }, [chats, activeChatId]);

  const toggleFollowChannel = (id) => {
    setFollowingChannels((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <main className="wa-main-body">
      {/* Left Slim Rail (Desktop WhatsApp Web style) */}
      <aside className="wa-icon-rail" aria-label="Quick Actions">
        <div className="wa-rail-group">
          <button
            className={`wa-rail-btn ${activeTab === 'chats' ? 'active' : ''}`}
            title="Chats"
            onClick={() => setActiveTab('chats')}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 13.85 2.5 15.58 3.39 17.06L2.05 22L7.09 20.68C8.54 21.52 10.22 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM16.5 14.5C16.28 14.5 14.5 13.6 14.17 13.44C13.83 13.28 13.58 13.2 13.33 13.58C13.08 13.96 12.36 14.8 12.14 15.05C11.92 15.3 11.69 15.33 11.31 15.14C10.93 14.95 9.71 14.55 8.27 13.27C7.15 12.27 6.39 11.03 6.17 10.65C5.95 10.27 6.15 10.06 6.34 9.87C6.51 9.7 6.72 9.43 6.91 9.21C7.1 8.99 7.16 8.83 7.29 8.58C7.42 8.33 7.36 8.1 7.27 7.91C7.18 7.72 6.42 5.86 6.11 5.1C5.8 4.36 5.48 4.46 5.25 4.45C5.04 4.45 4.79 4.44 4.54 4.44C4.29 4.44 3.88 4.53 3.54 4.9C3.19 5.27 2.22 6.18 2.22 8.03C2.22 9.88 3.57 11.66 3.76 11.91C3.95 12.16 6.42 15.98 10.2 17.61C11.1 18 11.8 18.23 12.35 18.41C13.28 18.7 14.12 18.66 14.79 18.56C15.54 18.45 17.09 17.62 17.41 16.73C17.73 15.84 17.73 15.08 17.63 14.92C17.54 14.77 17.29 14.68 16.91 14.5H16.5Z" />
            </svg>
            {unreadCount > 0 && (
              <span className="wa-badge-pill" style={{ top: 2, right: 2 }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          <button
            className={`wa-rail-btn ${activeTab === 'status' ? 'active' : ''}`}
            title="Status"
            onClick={() => setActiveTab('status')}
          >
            <CircleDashed size={22} />
          </button>

          <button
            className={`wa-rail-btn ${activeTab === 'updates' ? 'active' : ''}`}
            title="Channels & Updates"
            onClick={() => setActiveTab('updates')}
          >
            <Megaphone size={21} />
          </button>

          <button
            className={`wa-rail-btn ${activeTab === 'calls' ? 'active' : ''}`}
            title="Calls"
            onClick={() => setActiveTab('calls')}
          >
            <Phone size={21} />
          </button>
        </div>

        <div className="wa-rail-group">
          <button className="wa-rail-btn" title="Starred messages">
            <Star size={20} />
          </button>
          <button className="wa-rail-btn" title="Settings">
            <Settings size={20} />
          </button>
          <div 
            className="wa-avatar-wrapper" 
            style={{ width: 36, height: 36, marginTop: 4, cursor: 'pointer' }}
            title="Your Profile"
          >
            <img
              src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"
              alt="Profile"
              className="wa-avatar-img"
            />
          </div>
        </div>
      </aside>

      {/* CHATS TAB CONTENT */}
      {activeTab === 'chats' && (
        <>
          {/* Left Sidebar: Chats List */}
          <section className="wa-sidebar" aria-label="Chats list">
            {/* Header with Title and Quick Filter Actions */}
            <div className="wa-sidebar-header">
              <div className="wa-sidebar-title-row">
                <span className="wa-sidebar-title">Chats</span>
                <div className="wa-sidebar-actions">
                  <button 
                    className="wa-nav-icon-btn" 
                    title="New chat"
                    onClick={() => setShowNewChatModal(true)}
                  >
                    <Plus size={20} />
                  </button>
                  <button className="wa-nav-icon-btn" title="Filter unread chats">
                    <Filter size={18} />
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="wa-search-container">
                <Search size={17} />
                <input
                  type="text"
                  className="wa-search-input"
                  placeholder="Search or start a new chat"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button 
                    className="wa-nav-icon-btn" 
                    style={{ width: 22, height: 22 }}
                    onClick={() => setSearchQuery('')}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Filter Chips matching screenshot */}
              <div className="wa-filter-row">
                <button
                  className={`wa-filter-chip ${filterType === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterType('all')}
                >
                  All
                </button>
                <button
                  className={`wa-filter-chip ${filterType === 'unread' ? 'active' : ''}`}
                  onClick={() => setFilterType('unread')}
                >
                  Unread {unreadCount > 0 && <span style={{ opacity: 0.9 }}>{unreadCount}</span>}
                </button>
                <button
                  className={`wa-filter-chip ${filterType === 'favourites' ? 'active' : ''}`}
                  onClick={() => setFilterType('favourites')}
                >
                  Favourites
                </button>
                <button
                  className={`wa-filter-chip ${filterType === 'groups' ? 'active' : ''}`}
                  onClick={() => setFilterType('groups')}
                >
                  Groups {groupCount > 0 && <span style={{ opacity: 0.9 }}>{groupCount}</span>}
                </button>
                <button className="wa-filter-chip wa-filter-chip-plus" title="Add custom list">
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Notification Off Alert Banner matching screenshot */}
            {showAlertBanner && (
              <div className="wa-alert-banner">
                <div className="wa-alert-left">
                  <div className="wa-alert-icon">
                    <BellOff size={18} />
                  </div>
                  <div className="wa-alert-text">
                    Message notifications are off. <span className="wa-alert-link">Turn on</span>
                  </div>
                </div>
                <button 
                  className="wa-nav-icon-btn" 
                  style={{ width: 28, height: 28 }}
                  onClick={() => setShowAlertBanner(false)}
                  title="Dismiss notification"
                >
                  <X size={15} />
                </button>
              </div>
            )}

            {/* Archived Section matching screenshot */}
            <div className="wa-archived-row">
              <div className="wa-archived-left">
                <Archive size={19} />
                <span>Archived</span>
              </div>
              <span className="wa-archived-badge">@</span>
            </div>

            {/* Chat List Items */}
            <div className="wa-chat-list">
              {filteredChats.map((chat) => {
                const isSelected = chat.id === activeChatId;
                return (
                  <div
                    key={chat.id}
                    className={`wa-chat-item ${isSelected ? 'active' : ''}`}
                    onClick={() => {
                      setActiveChatId(chat.id);
                      // Clear unread on select
                      if (chat.unread > 0) {
                        setChats((prev) =>
                          prev.map((c) => (c.id === chat.id ? { ...c, unread: 0 } : c))
                        );
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    {/* Avatar */}
                    <div className="wa-avatar-wrapper">
                      {chat.avatar ? (
                        <img src={chat.avatar} alt={chat.name} className="wa-avatar-img" />
                      ) : (
                        <div 
                          className="wa-avatar-fallback"
                          style={{ backgroundColor: chat.avatarBg || '#1e3a8a' }}
                        >
                          {chat.initials || chat.name.charAt(0)}
                        </div>
                      )}
                    </div>

                    {/* Content Details */}
                    <div className="wa-chat-details">
                      <div className="wa-chat-top-row">
                        <span className="wa-chat-name">{chat.name}</span>
                        <span className={`wa-chat-time ${chat.unread > 0 ? 'unread' : ''}`}>
                          {chat.time}
                        </span>
                      </div>

                      <div className="wa-chat-bottom-row">
                        <div className="wa-chat-snippet">
                          {/* Checkmark or special type icon */}
                          {chat.type === 'call' && (
                            <PhoneIncoming size={14} color="var(--wa-text-secondary)" />
                          )}
                          {chat.type === 'photo' && (
                            <>
                              <CheckCheck size={14} color="var(--wa-blue-tick)" />
                              <Camera size={14} style={{ marginRight: 2 }} />
                            </>
                          )}
                          {chat.type === 'text' && !chat.isGroup && (
                            <CheckCheck size={14} color="var(--wa-blue-tick)" />
                          )}
                          <span>{chat.lastMessage}</span>
                        </div>

                        {/* Meta indicators: Mute, Pin, Unread Badge */}
                        <div className="wa-chat-meta-icons">
                          {chat.isMuted && (
                            <VolumeX size={15} color="var(--wa-text-muted)" />
                          )}
                          {chat.pinned && (
                            <Pin size={15} color="var(--wa-text-muted)" style={{ transform: 'rotate(45deg)' }} />
                          )}
                          {chat.unread > 0 && (
                            <span className="wa-chat-unread-badge">
                              {chat.unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredChats.length === 0 && (
                <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--wa-text-secondary)' }}>
                  <p style={{ fontSize: '0.95rem' }}>No chats found matching "{searchQuery}"</p>
                </div>
              )}
            </div>
          </section>

          {/* Right Pane: Active Conversation */}
          <Chat
            activeChat={activeChat}
            messages={messages}
            onSendMessage={onSendMessage}
          />
        </>
      )}

      {/* STATUS TAB CONTENT */}
      {activeTab === 'status' && (
        <div className="wa-status-container">
          <div className="wa-status-sidebar">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--wa-text-primary)' }}>
              Status
            </h2>

            {/* My Status */}
            <div className="wa-status-item" onClick={() => setActiveStory(statusUpdates.recent[0])}>
              <div className="wa-avatar-wrapper" style={{ width: 48, height: 48 }}>
                <img
                  src={statusUpdates.myStatus.avatar}
                  alt="My Status"
                  className="wa-avatar-img"
                />
                <div 
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    backgroundColor: 'var(--wa-green-bright)',
                    color: '#111b21',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Plus size={14} />
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--wa-text-primary)' }}>
                  {statusUpdates.myStatus.name}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--wa-text-secondary)' }}>
                  {statusUpdates.myStatus.time}
                </div>
              </div>
            </div>

            {/* Recent Updates */}
            <div>
              <div className="wa-status-section-title">Recent Updates</div>
              {statusUpdates.recent.map((st) => (
                <div 
                  key={st.id} 
                  className="wa-status-item"
                  onClick={() => setActiveStory(st)}
                >
                  <div className="wa-status-ring">
                    <img src={st.avatar} alt={st.name} className="wa-status-ring-img" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--wa-text-primary)' }}>
                      {st.name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--wa-text-secondary)' }}>
                      {st.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Viewed Updates */}
            <div>
              <div className="wa-status-section-title" style={{ color: 'var(--wa-text-secondary)' }}>
                Viewed Updates
              </div>
              {statusUpdates.viewed.map((st) => (
                <div 
                  key={st.id} 
                  className="wa-status-item"
                  onClick={() => setActiveStory(st)}
                >
                  <div className="wa-status-ring viewed">
                    <img src={st.avatar} alt={st.name} className="wa-status-ring-img" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--wa-text-primary)' }}>
                      {st.name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--wa-text-secondary)' }}>
                      {st.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Preview */}
          <div className="wa-status-preview-pane">
            <CircleDashed size={64} color="var(--wa-icon-default)" />
            <p style={{ fontSize: '1rem' }}>Click on a contact to view their status update</p>
          </div>
        </div>
      )}

      {/* UPDATES / CHANNELS TAB CONTENT */}
      {activeTab === 'updates' && (
        <div className="wa-channels-container">
          <div className="wa-channels-header">
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--wa-text-primary)' }}>
              Stay updated on topics you care about
            </h2>
            <p style={{ color: 'var(--wa-text-secondary)', fontSize: '0.9rem' }}>
              Find channels to follow below. Updates from channels are private and end-to-end protected.
            </p>
          </div>

          <div className="wa-channels-grid">
            {channels.map((ch) => {
              const isFollowing = followingChannels[ch.id];
              return (
                <div key={ch.id} className="wa-channel-card">
                  <div className="wa-avatar-wrapper" style={{ width: 68, height: 68 }}>
                    <img src={ch.avatar} alt={ch.name} className="wa-avatar-img" />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', fontWeight: 600, fontSize: '1rem', color: 'var(--wa-text-primary)' }}>
                      <span>{ch.name}</span>
                      {ch.verified && (
                        <div style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: 'var(--wa-green-bright)', color: '#111b21', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={11} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--wa-text-secondary)', marginTop: '0.15rem' }}>
                      {ch.followers}
                    </div>
                  </div>

                  <p style={{ fontSize: '0.82rem', color: 'var(--wa-text-secondary)', lineHeight: 1.35, minHeight: 48 }}>
                    {ch.lastUpdate}
                  </p>

                  <button
                    className={`wa-follow-btn ${isFollowing ? 'following' : ''}`}
                    onClick={() => toggleFollowChannel(ch.id)}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CALLS TAB CONTENT */}
      {activeTab === 'calls' && (
        <div className="wa-calls-container">
          <div className="wa-calls-sidebar">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--wa-text-primary)', marginBottom: '0.5rem' }}>
              Calls
            </h2>

            {/* Create call link */}
            <div className="wa-call-link-card">
              <div className="wa-call-link-icon">
                <Link2 size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--wa-text-primary)' }}>
                  Create a call link
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--wa-text-secondary)' }}>
                  Share a link for your WhatsApp call
                </div>
              </div>
            </div>

            <div className="wa-status-section-title" style={{ marginTop: '0.5rem' }}>
              Recent
            </div>

            {/* Call Logs */}
            {callLogs.map((call) => (
              <div key={call.id} className="wa-chat-item" style={{ borderRadius: 8 }}>
                <div className="wa-avatar-wrapper" style={{ width: 44, height: 44 }}>
                  {call.avatar ? (
                    <img src={call.avatar} alt={call.name} className="wa-avatar-img" />
                  ) : (
                    <div 
                      className="wa-avatar-fallback" 
                      style={{ backgroundColor: call.avatarBg || '#b85d19' }}
                    >
                      {call.initials || call.name.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="wa-chat-details">
                  <div className="wa-chat-top-row">
                    <span className="wa-chat-name" style={{ color: call.status === 'missed' ? '#ef4444' : 'var(--wa-text-primary)' }}>
                      {call.name}
                    </span>
                  </div>
                  <div className="wa-chat-snippet">
                    {call.status === 'missed' ? (
                      <PhoneMissed size={14} color="#ef4444" />
                    ) : call.direction === 'incoming' ? (
                      <PhoneIncoming size={14} color="var(--wa-green-bright)" />
                    ) : (
                      <PhoneOutgoing size={14} color="var(--wa-green-bright)" />
                    )}
                    <span>{call.time}</span>
                  </div>
                </div>

                <button className="wa-nav-icon-btn" title="Call back">
                  {call.type === 'video' ? <Video size={18} /> : <Phone size={18} />}
                </button>
              </div>
            ))}
          </div>

          <div className="wa-status-preview-pane">
            <Phone size={64} color="var(--wa-icon-default)" />
            <p style={{ fontSize: '1rem' }}>Select a contact to make end-to-end encrypted audio or video calls</p>
          </div>
        </div>
      )}

      {/* Story Viewer Modal */}
      {activeStory && (
        <div className="wa-modal-overlay" onClick={() => setActiveStory(null)}>
          <div className="wa-story-viewer-modal" onClick={(e) => e.stopPropagation()}>
            <div className="wa-story-progress-bar">
              <div className="wa-story-progress-segment">
                <div className="wa-story-progress-fill" onAnimationEnd={() => setActiveStory(null)} />
              </div>
            </div>

            <div className="wa-story-top-user">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <img src={activeStory.avatar} alt={activeStory.name} style={{ width: 34, height: 34, borderRadius: '50%' }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{activeStory.name}</div>
                  <div style={{ fontSize: '0.72rem', opacity: 0.8 }}>{activeStory.time}</div>
                </div>
              </div>
              <button 
                className="wa-nav-icon-btn" 
                style={{ color: '#ffffff' }}
                onClick={() => setActiveStory(null)}
              >
                <X size={20} />
              </button>
            </div>

            <img src={activeStory.image} alt={activeStory.caption} className="wa-story-image" />

            <div className="wa-story-caption-overlay">
              {activeStory.caption}
            </div>
          </div>
        </div>
      )}

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="wa-modal-overlay" onClick={() => setShowNewChatModal(false)}>
          <div 
            style={{ 
              background: 'var(--wa-bg-panel)', 
              border: '1px solid var(--wa-border-subtle)', 
              borderRadius: 12, 
              padding: '1.25rem', 
              width: '90%', 
              maxWidth: 440,
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)' 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--wa-text-primary)' }}>New Chat</h3>
              <button className="wa-nav-icon-btn" onClick={() => setShowNewChatModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="wa-search-container" style={{ marginBottom: '1rem' }}>
              <Search size={16} />
              <input type="text" className="wa-search-input" placeholder="Search name or number" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 300, overflowY: 'auto' }}>
              <div 
                className="wa-chat-item" 
                style={{ borderRadius: 8 }}
                onClick={() => {
                  setActiveChatId('2');
                  setShowNewChatModal(false);
                }}
              >
                <div className="wa-avatar-wrapper" style={{ width: 40, height: 40 }}>
                  <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80" alt="You" className="wa-avatar-img" />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--wa-text-primary)' }}>@bagchi10 (You)</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--wa-text-secondary)' }}>Message yourself</div>
                </div>
              </div>

              <div 
                className="wa-chat-item" 
                style={{ borderRadius: 8 }}
                onClick={() => {
                  setActiveChatId('1');
                  setShowNewChatModal(false);
                }}
              >
                <div className="wa-avatar-wrapper" style={{ width: 40, height: 40 }}>
                  <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80" alt="Baba" className="wa-avatar-img" />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--wa-text-primary)' }}>Baba</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--wa-text-secondary)' }}>Busy at work</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default Home;
