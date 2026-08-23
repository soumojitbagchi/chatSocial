import React from 'react';
import { 
  MessageSquare, 
  CircleDashed, 
  Megaphone, 
  Phone 
} from 'lucide-react';
import '../style/components.css';

const Footer = ({ activeTab, setActiveTab, totalUnread = 26, missedCalls = 2 }) => {
  const tabs = [
    {
      id: 'chats',
      label: 'Chats',
      icon: MessageSquare,
      badge: totalUnread > 0 ? (totalUnread > 99 ? '99+' : totalUnread) : null,
      badgeType: 'green'
    },
    {
      id: 'status',
      label: 'Status',
      icon: CircleDashed,
      badge: true, // dot indicator
      badgeType: 'dot'
    },
    {
      id: 'updates',
      label: 'Updates',
      icon: Megaphone,
      badge: null
    },
    {
      id: 'calls',
      label: 'Calls',
      icon: Phone,
      badge: missedCalls > 0 ? missedCalls : null,
      badgeType: 'green'
    }
  ];

  return (
    <footer className="wa-footer-nav" role="navigation" aria-label="Bottom Navigation">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            className={`wa-footer-tab ${isActive ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            aria-label={tab.label}
            aria-selected={isActive}
            role="tab"
          >
            <div className="wa-footer-tab-pill">
              <Icon size={20} />
              {tab.badge && tab.badgeType === 'green' && (
                <span className="wa-badge-pill" style={{ top: -2, right: -4 }}>
                  {tab.badge}
                </span>
              )}
              {tab.badge && tab.badgeType === 'dot' && (
                <span 
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 4,
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    backgroundColor: 'var(--wa-green-bright)'
                  }} 
                />
              )}
            </div>
            <span className="wa-footer-label">{tab.label}</span>
          </button>
        );
      })}
    </footer>
  );
};

export default Footer;
