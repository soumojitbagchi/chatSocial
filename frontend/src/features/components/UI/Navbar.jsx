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
  setActiveTab,
  onLogout
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
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 10.2018L9.30278 12L12 13.7982L14.6972 12L12 10.2018ZM16.5 10.7982L19.1972 9L13 4.86852V8.46482L16.5 10.7982ZM20 10.8685L18.3028 12L20 13.1315V10.8685ZM16.5 13.2018L13 15.5352V19.1315L19.1972 15L16.5 13.2018ZM11 8.46482V4.86852L4.80278 9L7.5 10.7982L11 8.46482ZM4.80278 15L11 19.1315V15.5352L7.5 13.2018L4.80278 15ZM5.69722 12L4 10.8685V13.1315L5.69722 12ZM2 9C2 8.66565 2.1671 8.35342 2.4453 8.16795L11.4453 2.16795C11.7812 1.94402 12.2188 1.94402 12.5547 2.16795L21.5547 8.16795C21.8329 8.35342 22 8.66565 22 9V15C22 15.3344 21.8329 15.6466 21.5547 15.8321L12.5547 21.8321C12.2188 22.056 11.7812 22.056 11.4453 21.8321L2.4453 15.8321C2.1671 15.6466 2 15.3344 2 15V9Z"></path></svg>
          </svg>
        </div>
        <h1 className="wa-brand-heading">chatSocial</h1>
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
            <button 
              className="wa-dropdown-item" 
              onClick={() => { 
                setShowMenu(false); 
                if (onLogout) onLogout(); 
              }}
            >
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
