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
  LogOut
} from 'lucide-react';
import '../style/components.css';
import { ChatChosenIcon } from '@/components/ui/logo';
const Navbar = ({ 
  searchQuery, 
  setSearchQuery, 
  totalUnread = 26, 
  onNewChat, 
  activeTab: _activeTab,
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
        <div className="wa-brand-icon" title="chatSocial" style={{ color: '#10b981' }}>
          <ChatChosenIcon size={22} />
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
