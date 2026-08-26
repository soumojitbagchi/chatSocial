import React from 'react';
import { Clock } from 'lucide-react';
import '../style/components.css';

const ConversationHistory = ({ chatName, messages = [] }) => {
  return (
    <div style={{ padding: '1rem', backgroundColor: 'var(--wa-bg-panel)', color: 'var(--wa-text-primary)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <Clock size={18} color="var(--wa-green-primary)" />
        <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>History for {chatName}</h4>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {messages.map((m, idx) => (
          <div 
            key={idx} 
            style={{ 
              padding: '0.5rem 0.75rem', 
              background: 'var(--wa-bg-header)', 
              borderRadius: 6,
              fontSize: '0.84rem' 
            }}
          >
            <div style={{ color: 'var(--wa-text-secondary)', fontSize: '0.72rem' }}>{m.time}</div>
            <div>{m.text || m.fileName || 'Media item'}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConversationHistory;
