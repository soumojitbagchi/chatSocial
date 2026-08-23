import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  MoreVertical, 
  MessageSquarePlus, 
  X, 
  Users, 
  Radio, 
  Laptop, 
  Star, 
  Settings, 
  LogOut,
  PhoneCall,
  CircleDot
} from 'lucide-react';
import '../style/components.css';

const Navbar = ({ 
  searchQuery, 
  setSearchQuery, 
  totalUnread = 26, 
  onNewChat, 
  activeTab, 
  setActiveTab 
}) => {
  const [showSearch, setShowSearch] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const searchInputRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="wa-navbar">
      {/* Brand & Heading */}
      <div className="wa-navbar-left">
        <div className="wa-brand-icon" title="WhatsApp Web">
          <svg 
            viewBox="0 0 24 24" 
            width="22" 
            height="22" 
            fill="currentColor"
          >
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.05 20.15C10.56 20.15 9.11 19.75 7.85 19L7.55 18.82L4.43 19.64L5.26 16.6L5.06 16.29C4.24 14.98 3.8 13.47 3.8 11.91C3.8 7.37 7.5 3.67 12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.05 20.15ZM16.56 14.39C16.31 14.26 15.09 13.66 14.86 13.58C14.64 13.49 14.47 13.45 14.31 13.7C14.14 13.95 13.66 14.52 13.51 14.69C13.37 14.85 13.22 14.87 12.97 14.75C12.72 14.62 11.92 14.36 10.97 13.51C10.23 12.85 9.73 12.04 9.58 11.79C9.44 11.54 9.57 11.4 9.69 11.28C9.8 11.17 9.94 10.99 10.06 10.85C10.19 10.7 10.23 10.6 10.31 10.43C10.39 10.27 10.35 10.12 10.29 10C10.23 9.87 9.73 8.65 9.53 8.14C9.33 7.65 9.12 7.71 8.97 7.71C8.83 7.71 8.66 7.7 8.5 7.7C8.33 7.7 8.06 7.76 7.83 8.01C7.6 8.26 6.95 8.87 6.95 10.12C6.95 11.37 7.86 12.57 7.99 12.74C8.11 12.9 9.78 15.48 12.34 16.58C12.95 16.84 13.42 17 13.79 17.12C14.41 17.31 14.97 17.29 15.41 17.22C15.91 17.15 16.94 16.6 17.15 16.01C17.36 15.42 17.36 14.91 17.3 14.81C17.23 14.71 17.07 14.65 16.82 14.52L16.56 14.39Z" />
          </svg>
        </div>
        <h1 className="wa-brand-heading">WhatsApp</h1>
        <span className="wa-brand-badge">Web</span>
      </div>

      {/* Center Search Input (when search button toggled) */}
      {showSearch && (
        <div className="wa-nav-search-bar">
          <Search size={16} color="var(--wa-text-secondary)" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search messages, chats, contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              className="wa-nav-icon-btn" 
              style={{ width: 24, height: 24 }}
              onClick={() => setSearchQuery('')}
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* Right Controls: Search, New Messages, 3-Dots Menu */}
      <div className="wa-navbar-right" ref={menuRef}>
        {/* Search button */}
        <button
          className={`wa-nav-icon-btn ${showSearch ? 'active' : ''}`}
          title="Search"
          aria-label="Search"
          onClick={() => setShowSearch(!showSearch)}
        >
          <Search size={20} />
        </button>

        {/* New Messages Button */}
        <button
          className="wa-nav-icon-btn"
          title="New messages & chats"
          aria-label="New messages & chats"
          onClick={onNewChat}
        >
          <MessageSquarePlus size={20} />
          {totalUnread > 0 && (
            <span className="wa-badge-pill" title={`${totalUnread} unread messages`}>
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </button>

        {/* 3-Dots Menu Button */}
        <button
          className={`wa-nav-icon-btn ${showMenu ? 'active' : ''}`}
          title="More options"
          aria-label="3 dots menu options"
          onClick={() => setShowMenu(!showMenu)}
        >
          <MoreVertical size={20} />
        </button>

        {/* 3-Dots Dropdown Menu */}
        {showMenu && (
          <div className="wa-dropdown-menu">
            <button className="wa-dropdown-item" onClick={() => { setActiveTab('chats'); setShowMenu(false); }}>
              <Users size={16} color="var(--wa-text-secondary)" />
              <span>New group</span>
            </button>
            <button className="wa-dropdown-item" onClick={() => { setShowMenu(false); }}>
              <Radio size={16} color="var(--wa-text-secondary)" />
              <span>New broadcast</span>
            </button>
            <button className="wa-dropdown-item" onClick={() => { setShowMenu(false); }}>
              <Laptop size={16} color="var(--wa-text-secondary)" />
              <span>Linked devices</span>
            </button>
            <button className="wa-dropdown-item" onClick={() => { setShowMenu(false); }}>
              <Star size={16} color="var(--wa-text-secondary)" />
              <span>Starred messages</span>
            </button>
            <div className="wa-dropdown-divider" />
            <button className="wa-dropdown-item" onClick={() => { setShowMenu(false); }}>
              <Settings size={16} color="var(--wa-text-secondary)" />
              <span>Settings</span>
            </button>
            <button className="wa-dropdown-item" onClick={() => { setShowMenu(false); }}>
              <LogOut size={16} color="#ef4444" />
              <span style={{ color: '#ef4444' }}>Log out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
