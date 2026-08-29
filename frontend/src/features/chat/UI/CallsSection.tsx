import React, { useState, useMemo } from 'react';
import {
  Phone,
  Video,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Plus,
  Search,
  PhoneCall
} from 'lucide-react';
import '../style/components.css';

export interface CallLogItem {
  id: string;
  name: string;
  avatar: string;
  type: 'video' | 'audio';
  direction: 'incoming' | 'outgoing' | 'missed';
  status: 'completed' | 'missed';
  duration: string;
  time: string;
}

export interface CallsSectionProps {
  calls: CallLogItem[];
  onStartCall: (name: string, type: 'audio' | 'video', avatar?: string) => void;
}

const defaultAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

export const CallsSection: React.FC<CallsSectionProps> = ({ calls, onStartCall }) => {
  const [filter, setFilter] = useState<'all' | 'missed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCalls = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return calls.filter((call) => {
      const matchesSearch = !q || call.name.toLowerCase().includes(q);
      return matchesSearch && (filter === 'all' || call.direction === 'missed');
    });
  }, [calls, searchQuery, filter]);

  return (
    <div className="cs-workspace cs-product-page">
      <aside className="cs-workspace-sidebar">
        <header className="cs-product-header">
          <div>
            <span className="cs-product-heading-icon"><Phone size={18} /></span>
            <h2>Calls</h2>
          </div>
          <button
            className="cs-primary-button"
            onClick={() => onStartCall('Edward Lietz', 'audio', defaultAvatar)}
          >
            <Plus size={15} />
            New call
          </button>
        </header>

        <div className="cs-product-tools">
          <label className="cs-product-search">
            <Search size={16} />
            <input
              type="search"
              placeholder="Search calls"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>
          <div className="cs-segmented" aria-label="Call history filter">
            <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All</button>
            <button className={filter === 'missed' ? 'active' : ''} onClick={() => setFilter('missed')}>Missed</button>
          </div>
        </div>

        <div className="cs-product-list">
          {filteredCalls.length === 0 ? (
            <div className="cs-list-empty">
              <Phone size={21} />
              <h3>No calls yet</h3>
              <p>Your recent voice and video calls will appear here.</p>
              <button className="cs-primary-button" onClick={() => onStartCall('Edward Lietz', 'audio', defaultAvatar)}>Start a call</button>
            </div>
          ) : filteredCalls.map((call) => {
            const DirectionIcon = call.direction === 'incoming'
              ? PhoneIncoming
              : call.direction === 'outgoing'
                ? PhoneOutgoing
                : PhoneMissed;

            return (
              <article className="cs-call-row" key={call.id}>
                <img src={call.avatar || defaultAvatar} alt="" />
                <div className="cs-call-row-copy">
                  <strong className={call.direction === 'missed' ? 'is-missed' : ''}>{call.name}</strong>
                  <span>
                    <DirectionIcon size={13} />
                    {call.time}{call.duration !== '0s' ? ` · ${call.duration}` : ''}
                  </span>
                </div>
                <button
                  className="cs-icon-button"
                  onClick={() => onStartCall(call.name, call.type, call.avatar)}
                  aria-label={`${call.type === 'video' ? 'Video call' : 'Call'} ${call.name}`}
                >
                  {call.type === 'video' ? <Video size={17} /> : <Phone size={16} />}
                </button>
              </article>
            );
          })}
        </div>
      </aside>

      <main className="cs-workspace-content cs-product-blank">
        <div className="cs-product-blank-icon"><PhoneCall size={24} /></div>
        <h3>Call when typing is not enough</h3>
        <p>Start a clear voice or video call with anyone in your conversations.</p>
        <div className="cs-product-actions">
          <button className="cs-primary-button" onClick={() => onStartCall('Edward Lietz', 'audio', defaultAvatar)}><Phone size={15} />Voice call</button>
          <button className="cs-secondary-button" onClick={() => onStartCall('Carla Jenkins', 'video', defaultAvatar)}><Video size={15} />Video call</button>
        </div>
      </main>
    </div>
  );
};

export default CallsSection;
