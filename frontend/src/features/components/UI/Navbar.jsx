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
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM17.56 16.68C17.33 17.33 16.42 17.88 15.65 18.05C15.12 18.16 14.44 18.25 12.13 17.29C9.17 16.07 7.27 13.06 7.12 12.86C6.98 12.67 5.92 11.26 5.92 9.8C5.92 8.34 6.66 7.63 6.95 7.33C7.2 7.07 7.56 6.96 7.92 6.96C8.04 6.96 8.16 6.97 8.26 6.97C8.56 6.98 8.71 7.01 8.91 7.48C9.16 8.08 9.77 9.56 9.84 9.71C9.92 9.87 9.99 10.07 9.88 10.28C9.78 10.5 9.69 10.6 9.54 10.77C9.39 10.95 9.25 11.08 9.09 11.27C8.92 11.45 8.74 11.65 8.95 12.01C9.15 12.36 9.85 13.51 10.88 14.43C12.21 15.62 13.3 16.01 13.69 16.17C14 16.3 14.19 16.27 14.37 16.07C14.59 15.81 15.3 14.98 15.54 14.64C15.77 14.3 16.01 14.35 16.32 14.47C16.64 14.59 18.34 15.43 18.69 15.61C19.04 15.78 19.27 15.86 19.35 16C19.43 16.14 19.43 16.8 19.19 17.45L17.56 16.68Z" />
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
