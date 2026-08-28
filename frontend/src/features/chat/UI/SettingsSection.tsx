import React, { useState } from 'react';
import {
  Bell,
  Camera,
  Check,
  Database,
  Edit3,
  Lock,
  LogOut,
  Moon,
  Settings,
  ShieldCheck,
  Smartphone,
  Sun
} from 'lucide-react';
import '../style/components.css';

export interface UserProfileData {
  name: string;
  username: string;
  avatar: string;
  phone: string;
  about: string;
}

export interface SettingsSectionProps {
  user?: UserProfileData;
  onUpdateProfile?: (updated: Partial<UserProfileData>) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onLogout?: () => void;
}

type SettingsTab = 'profile' | 'privacy' | 'chats' | 'notifications' | 'storage';

const tabs: Array<{ id: SettingsTab; label: string; icon: React.ComponentType<{ size?: number }> }> = [
  { id: 'privacy', label: 'Privacy and security', icon: Lock },
  { id: 'chats', label: 'Chat appearance', icon: Smartphone },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'storage', label: 'Storage and data', icon: Database }
];

const fallbackUser: UserProfileData = {
  name: 'Soumojit Bagchi',
  username: '@bagchi10',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  phone: '+1 (555) 234-5678',
  about: 'Usually around. Say hello.'
};

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  user = fallbackUser,
  onUpdateProfile,
  theme,
  onToggleTheme,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [about, setAbout] = useState(user.about);
  const [readReceipts, setReadReceipts] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const saveProfile = () => {
    onUpdateProfile?.({ name, about });
    setIsEditing(false);
  };

  return (
    <div className="cs-workspace cs-settings-workspace cs-product-page">
      <aside className="cs-workspace-sidebar cs-settings-sidebar">
        <header className="cs-product-header cs-settings-header">
          <div>
            <span className="cs-product-heading-icon"><Settings size={18} /></span>
            <h2>Settings</h2>
          </div>
        </header>

        <nav className="cs-settings-nav" aria-label="Settings sections">
          <button className={`cs-settings-profile ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
            <img src={user.avatar} alt="" />
            <span><strong>{user.name}</strong><small>{user.username}</small></span>
          </button>

          <div className="cs-list-label">Preferences</div>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button className={`cs-settings-link ${activeTab === tab.id ? 'active' : ''}`} key={tab.id} onClick={() => setActiveTab(tab.id)}>
                <Icon size={17} />
                <span>{tab.label}</span>
              </button>
            );
          })}

          <div className="cs-settings-theme">
            <span>{theme === 'dark' ? <Moon size={17} /> : <Sun size={17} />}<span>Dark theme</span></span>
            <button className={`cs-switch ${theme === 'dark' ? 'active' : ''}`} onClick={onToggleTheme} aria-label={theme === 'dark' ? 'Use light theme' : 'Use dark theme'}><span /></button>
          </div>

          {onLogout && <button className="cs-settings-link danger" onClick={onLogout}><LogOut size={17} /><span>Log out</span></button>}
        </nav>
      </aside>

      <main className="cs-workspace-content cs-settings-main">
        {activeTab === 'profile' && (
          <section className="cs-settings-section">
            <header className="cs-settings-title">
              <div><h3>Profile</h3><p>Manage how you appear to other people.</p></div>
              {!isEditing && <button className="cs-secondary-button" onClick={() => setIsEditing(true)}><Edit3 size={15} />Edit profile</button>}
            </header>

            <div className="cs-profile-card">
              <div className="cs-profile-avatar">
                <img src={user.avatar} alt={user.name} />
                <button aria-label="Change profile photo"><Camera size={15} /></button>
              </div>
              <div><h4>{user.name}</h4><p>{user.username}</p><span><i />Online</span></div>
            </div>

            <div className="cs-settings-card">
              <div className="cs-field-row">
                <label htmlFor="profile-name">Display name</label>
                {isEditing ? <input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} /> : <p>{name}</p>}
              </div>
              <div className="cs-field-row">
                <label htmlFor="profile-about">About</label>
                {isEditing ? <input id="profile-about" value={about} onChange={(event) => setAbout(event.target.value)} /> : <p>{about}</p>}
              </div>
              <div className="cs-field-row"><span>Phone number</span><p>{user.phone}</p></div>
              {isEditing && (
                <div className="cs-card-actions">
                  <button className="cs-primary-button" onClick={saveProfile}><Check size={15} />Save changes</button>
                  <button className="cs-secondary-button" onClick={() => setIsEditing(false)}>Cancel</button>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'privacy' && (
          <SettingsPanel title="Privacy and security" description="Control message privacy and account protection.">
            <div className="cs-security-banner"><ShieldCheck size={20} /><div><strong>End-to-end encryption</strong><p>Your personal messages and calls are protected in transit.</p></div></div>
            <SettingToggle title="Read receipts" description="Let people know when you have read their messages." checked={readReceipts} onChange={setReadReceipts} />
            <SettingValue title="Two-step verification" description="Require an extra PIN when registering your account." value="Enabled" />
          </SettingsPanel>
        )}

        {activeTab === 'chats' && (
          <SettingsPanel title="Chat appearance" description="Choose how conversations look on this device.">
            <SettingAction title="Theme" description={`Currently using ${theme} mode.`} action="Change theme" onClick={onToggleTheme} />
          </SettingsPanel>
        )}

        {activeTab === 'notifications' && (
          <SettingsPanel title="Notifications" description="Choose how chatSocial gets your attention.">
            <SettingToggle title="Notification sounds" description="Play a sound for incoming messages and calls." checked={soundEnabled} onChange={setSoundEnabled} />
          </SettingsPanel>
        )}

        {activeTab === 'storage' && (
          <SettingsPanel title="Storage and data" description="Review local data used by this device.">
            <SettingValue title="Local cache" description="Conversation data kept for faster loading." value="14.2 MB" />
            <SettingValue title="Media" description="Photos, videos, documents, and voice notes." value="86.4 MB" />
          </SettingsPanel>
        )}
      </main>
    </div>
  );
};

function SettingsPanel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <section className="cs-settings-section"><header className="cs-settings-title"><div><h3>{title}</h3><p>{description}</p></div></header><div className="cs-settings-card">{children}</div></section>;
}

function SettingToggle({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <div className="cs-setting-row"><div><strong>{title}</strong><p>{description}</p></div><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} aria-label={title} /></div>;
}

function SettingValue({ title, description, value }: { title: string; description: string; value: string }) {
  return <div className="cs-setting-row"><div><strong>{title}</strong><p>{description}</p></div><span className="cs-setting-value">{value}</span></div>;
}

function SettingAction({ title, description, action, onClick }: { title: string; description: string; action: string; onClick: () => void }) {
  return <div className="cs-setting-row"><div><strong>{title}</strong><p>{description}</p></div><button className="cs-secondary-button" onClick={onClick}>{action}</button></div>;
}

export default SettingsSection;
