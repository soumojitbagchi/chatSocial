import React, { useState } from 'react';
import { 
  Settings, 
  ShieldCheck, 
  Lock, 
  Bell, 
  Moon, 
  Sun, 
  Database, 
  LogOut, 
  Camera, 
  Edit3, 
  Check, 
  Smartphone
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

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  user = {
    name: 'Soumojit Bagchi',
    username: '@bagchi10',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    phone: '+1 (555) 234-5678',
    about: 'Building clean, fast, and delightful interfaces ⚡'
  },
  onUpdateProfile,
  theme,
  onToggleTheme,
  onLogout
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'privacy' | 'chats' | 'notifications' | 'storage'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [about, setAbout] = useState(user.about);
  const [readReceipts, setReadReceipts] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const handleSaveProfile = () => {
    if (onUpdateProfile) {
      onUpdateProfile({ name, about });
    }
    setIsEditing(false);
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Left Settings Menu */}
      <section className="w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Settings size={22} className="text-violet-600 dark:text-violet-400" />
            <span>Settings</span>
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {/* User Mini Profile Header */}
          <div 
            onClick={() => setActiveSubTab('profile')}
            className={`p-3 rounded-2xl flex items-center gap-3 cursor-pointer transition-colors ${
              activeSubTab === 'profile'
                ? 'bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent'
            }`}
          >
            <img
              src={user.avatar}
              alt={user.name}
              className="w-12 h-12 rounded-full object-cover shadow-sm ring-2 ring-violet-500/20"
            />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.name}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.username}</p>
            </div>
          </div>

          <div className="pt-2 pb-1">
            <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
          </div>

          {/* Navigation Links */}
          <button
            onClick={() => setActiveSubTab('privacy')}
            className={`w-full p-3 rounded-xl flex items-center gap-3 text-xs font-semibold transition-colors text-left ${
              activeSubTab === 'privacy'
                ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Lock size={18} className="text-slate-400" />
            <span>Privacy & Encryption</span>
          </button>

          <button
            onClick={() => setActiveSubTab('chats')}
            className={`w-full p-3 rounded-xl flex items-center gap-3 text-xs font-semibold transition-colors text-left ${
              activeSubTab === 'chats'
                ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Smartphone size={18} className="text-slate-400" />
            <span>Chat Theme & Wallpaper</span>
          </button>

          <button
            onClick={() => setActiveSubTab('notifications')}
            className={`w-full p-3 rounded-xl flex items-center gap-3 text-xs font-semibold transition-colors text-left ${
              activeSubTab === 'notifications'
                ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Bell size={18} className="text-slate-400" />
            <span>Notifications & Sounds</span>
          </button>

          <button
            onClick={() => setActiveSubTab('storage')}
            className={`w-full p-3 rounded-xl flex items-center gap-3 text-xs font-semibold transition-colors text-left ${
              activeSubTab === 'storage'
                ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Database size={18} className="text-slate-400" />
            <span>Storage & Network</span>
          </button>

          {/* Theme Switcher Row */}
          <div className="p-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
              <span>Dark Theme</span>
            </span>
            <button
              onClick={onToggleTheme}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                theme === 'dark' ? 'bg-violet-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full bg-white transition-transform transform ${
                  theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full p-3 rounded-xl flex items-center gap-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-left mt-4"
            >
              <LogOut size={18} />
              <span>Log out of chatSocial</span>
            </button>
          )}
        </div>
      </section>

      {/* Right Settings Details Content */}
      <section className="flex-1 overflow-y-auto p-6 md:p-10 bg-white dark:bg-slate-900/60">
        <div className="max-w-2xl mx-auto space-y-6">
          {activeSubTab === 'profile' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Profile Details</h3>

              <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <div className="relative">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-24 h-24 rounded-full object-cover shadow-md ring-4 ring-white dark:ring-slate-900"
                  />
                  <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center shadow cursor-pointer">
                    <Camera size={15} />
                  </button>
                </div>

                <div className="flex-1 text-center sm:text-left space-y-1">
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">{user.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{user.username}</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">● Online</p>
                </div>
              </div>

              {/* Editable Fields */}
              <div className="space-y-4 p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Display Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  ) : (
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    About / Status Quote
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={about}
                      onChange={(e) => setAbout(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  ) : (
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{about}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <p className="text-sm text-slate-500">{user.phone}</p>
                </div>

                <div className="pt-2">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSaveProfile}
                        className="px-4 py-2 rounded-lg bg-violet-600 text-white font-semibold text-xs flex items-center gap-1.5 shadow"
                      >
                        <Check size={14} />
                        <span>Save Changes</span>
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-200 text-xs font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 size={14} />
                      <span>Edit Profile</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'privacy' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Privacy & Security</h3>
              
              <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
                <ShieldCheck size={28} className="text-emerald-600 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                    Zero-Knowledge Post-Quantum Encryption
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                    Your personal messages, calls, media, and status updates are end-to-end encrypted.
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Read Receipts</h4>
                    <p className="text-[11px] text-slate-500">Show double green ticks when messages are read</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={readReceipts}
                    onChange={(e) => setReadReceipts(e.target.checked)}
                    className="w-4 h-4 accent-violet-600 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Two-Step Verification</h4>
                    <p className="text-[11px] text-slate-500">Require an extra PIN when registering your account</p>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded">
                    Enabled
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'chats' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Chat Appearance</h3>
              
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Theme Mode</h4>
                    <p className="text-[11px] text-slate-500">Current: {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</p>
                  </div>
                  <button
                    onClick={onToggleTheme}
                    className="px-3.5 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold cursor-pointer shadow"
                  >
                    Toggle Theme
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'notifications' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Notifications</h3>
              
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Notification Sounds</h4>
                    <p className="text-[11px] text-slate-500">Play tone for incoming messages and alerts</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={(e) => setSoundEnabled(e.target.checked)}
                    className="w-4 h-4 accent-violet-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'storage' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Storage & Data</h3>
              
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Local Cache</span>
                  <span className="font-mono text-slate-500">14.2 MB</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Media Stored</span>
                  <span className="font-mono text-slate-500">86.4 MB</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default SettingsSection;
