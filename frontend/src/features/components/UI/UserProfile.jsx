import React from 'react';
import { Camera, Edit2 } from 'lucide-react';
import '../style/components.css';

const UserProfile = ({ onClose }) => {
  return (
    <div className="wa-modal-overlay" onClick={onClose}>
      <div 
        style={{ 
          backgroundColor: 'var(--wa-bg-panel)', 
          border: '1px solid var(--wa-border-subtle)', 
          borderRadius: 12, 
          width: '90%', 
          maxWidth: 420, 
          padding: '1.5rem',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--wa-text-primary)', marginBottom: '1.25rem' }}>
          Profile
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div className="wa-avatar-wrapper" style={{ width: 96, height: 96, marginBottom: '0.75rem' }}>
            <img
              src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"
              alt="Profile"
              className="wa-avatar-img"
            />
            <div 
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 28,
                height: 28,
                borderRadius: '50%',
                backgroundColor: 'var(--wa-green-primary)',
                color: '#111b21',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <Camera size={16} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--wa-green-primary)', fontWeight: 600 }}>Your Name</label>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: '0.95rem', color: 'var(--wa-text-primary)', fontWeight: 500 }}>Soumojit Bagchi (@bagchi10)</span>
              <Edit2 size={16} color="var(--wa-text-secondary)" style={{ cursor: 'pointer' }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--wa-green-primary)', fontWeight: 600 }}>About</label>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: '0.92rem', color: 'var(--wa-text-primary)' }}>Building clean, minimal & professional interfaces 🚀</span>
              <Edit2 size={16} color="var(--wa-text-secondary)" style={{ cursor: 'pointer' }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--wa-green-primary)', fontWeight: 600 }}>Phone number</label>
            <div style={{ fontSize: '0.92rem', color: 'var(--wa-text-secondary)', marginTop: 4 }}>
              +91 987 654 3210
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
