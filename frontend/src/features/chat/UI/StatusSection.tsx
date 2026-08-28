import React from 'react';
import { Camera, ChevronRight, CircleDashed, Plus } from 'lucide-react';
import '../style/components.css';

export interface StatusItem {
  id: string;
  userName: string;
  time: string;
  avatar: string;
  isMe?: boolean;
  hasStory: boolean;
  storiesCount?: number;
  storyImage?: string;
  caption?: string;
}

export interface StatusSectionProps {
  statusUpdates: StatusItem[];
  onViewStory: (status: StatusItem) => void;
  onAddStory?: () => void;
}

const defaultAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

export const StatusSection: React.FC<StatusSectionProps> = ({ statusUpdates, onViewStory, onAddStory }) => {
  const myStatus = statusUpdates.find((status) => status.isMe) || {
    id: 'my-status-init',
    userName: 'My status',
    time: 'Add an update',
    avatar: defaultAvatar,
    hasStory: false,
    isMe: true
  };
  const recentUpdates = statusUpdates.filter((status) => !status.isMe);

  return (
    <div className="cs-workspace cs-product-page">
      <aside className="cs-workspace-sidebar">
        <header className="cs-product-header">
          <div>
            <span className="cs-product-heading-icon"><CircleDashed size={18} /></span>
            <h2>Status</h2>
          </div>
          <button className="cs-primary-button" onClick={onAddStory}><Plus size={15} />Add update</button>
        </header>

        <div className="cs-status-list">
          <button className="cs-my-status" onClick={onAddStory}>
            <span className="cs-status-avatar">
              <img src={myStatus.avatar} alt="" />
              <i><Plus size={11} /></i>
            </span>
            <span>
              <strong>My status</strong>
              <small>Share a photo or quick update</small>
            </span>
          </button>

          <div className="cs-list-label">Recent updates</div>
          {recentUpdates.length === 0 ? (
            <div className="cs-list-empty cs-status-empty">
              <CircleDashed size={21} />
              <h3>No updates yet</h3>
              <p>Updates from your contacts will appear here.</p>
            </div>
          ) : recentUpdates.map((item) => (
            <button className="cs-status-row" key={item.id} onClick={() => onViewStory(item)}>
              <span className="cs-status-avatar has-update"><img src={item.avatar || defaultAvatar} alt="" /></span>
              <span>
                <strong>{item.userName}</strong>
                <small>{item.time}</small>
              </span>
              <ChevronRight size={16} />
            </button>
          ))}
        </div>
      </aside>

      <main className="cs-workspace-content cs-product-blank">
        <div className="cs-product-blank-icon"><Camera size={24} /></div>
        <h3>Share a moment</h3>
        <p>Post a photo or short update for your contacts to see for 24 hours.</p>
        <button className="cs-primary-button" onClick={onAddStory}><Camera size={15} />Add an update</button>
      </main>
    </div>
  );
};

export default StatusSection;
