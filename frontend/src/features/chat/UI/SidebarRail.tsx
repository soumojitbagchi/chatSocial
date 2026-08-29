import React from 'react';
import { 
  MessageSquare, 
  Users, 
  CircleDashed, 
  Phone, 
  User, 
  Settings, 
  LogOut,
  Moon,
  Sun
} from 'lucide-react';
import { InfinityGradientLogo } from '@/components/ui/logo';
import '../style/components.css';

export interface SidebarRailProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  totalUnread?: number;
  onLogout?: () => void;
  onOpenProfile?: () => void;
  userAvatar?: string;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const SidebarRail: React.FC<SidebarRailProps> = ({
  activeTab,
  setActiveTab,
  totalUnread = 12,
  onLogout,
  onOpenProfile,
  userAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  theme = 'light',
  onToggleTheme
}) => {
  return (
    <aside className="cs-rail" aria-label="Main Navigation Rail">
      <div className="cs-rail-logo-wrap" title="chatSocial">
        <InfinityGradientLogo size={28} />
      </div>

      <nav className="cs-rail-nav">
        <button
          className={`cs-rail-btn ${activeTab === 'chats' ? 'active' : ''}`}
          onClick={() => setActiveTab('chats')}
          title="Chats"
          aria-label="Chats"
        >
          <MessageSquare size={20} />
          {totalUnread > 0 && activeTab !== 'chats' && (
            <span className="cs-badge-dot" />
          )}
        </button>

        <button
          className={`cs-rail-btn ${activeTab === 'contacts' ? 'active' : ''}`}
          onClick={() => setActiveTab('contacts')}
          title="Contacts"
          aria-label="Contacts"
        >
          <User size={20} />
        </button>
        <button
          className={`cs-rail-btn ${activeTab === 'groups' ? 'active' : ''}`}
          onClick={() => setActiveTab('groups')}
          title="Groups & Channels"
          aria-label="Groups"
        >
          <Users size={20} />
        </button>

        <button
          className={`cs-rail-btn ${activeTab === 'status' ? 'active' : ''}`}
          onClick={() => setActiveTab('status')}
          title="Status & Stories"
          aria-label="Status"
        >
          <CircleDashed size={20} />
        </button>

        <button
          className={`cs-rail-btn ${activeTab === 'calls' ? 'active' : ''}`}
          onClick={() => setActiveTab('calls')}
          title="Calls"
          aria-label="Calls"
        >
          <Phone size={20} />
        </button>

        <button
          className={`cs-rail-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => {
            if (onOpenProfile) onOpenProfile();
            else setActiveTab('settings');
          }}
          title="Account Profile"
          aria-label="Account Profile"
        >
          <div className="cs-rail-avatar-ring">
            <img
              src={userAvatar}
              alt="You"
              className="w-full h-full rounded-full object-cover"
            />
          </div>
        </button>

        <button
          className={`cs-rail-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
          title="Settings"
          aria-label="Settings"
        >
          <Settings size={20} />
        </button>
      </nav>

      <div className="cs-rail-bottom">
        {onToggleTheme && (
          <button
            className="cs-rail-btn cs-rail-sub-btn"
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        )}

        {onLogout && (
          <button
            className="cs-rail-btn cs-rail-sub-btn text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
            onClick={onLogout}
            title="Log out"
          >
            <LogOut size={18} />
          </button>
        )}
      </div>
    </aside>
  );
};

export default SidebarRail;
