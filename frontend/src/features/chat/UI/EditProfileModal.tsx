import React, { useState, useRef } from 'react';
import { X, Camera, User, AtSign, FileText, Phone, MapPin, Check, Upload, Loader2 } from 'lucide-react';
import { chatApi } from '../api/chatApi';
export interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    name: string;
    username: string;
    avatar: string;
    phone: string;
    about: string;
    location?: string;
  };
  onSave: (updated: {
    name: string;
    username?: string;
    about: string;
    phone: string;
    avatar?: string;
    location?: string;
  }) => Promise<void> | void;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onSave,
}) => {
  const [name, setName] = useState(user.name || '');
  const [username, setUsername] = useState((user.username || '').replace(/^@/, ''));
  const [about, setAbout] = useState(user.about || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [location, setLocation] = useState(user.location || '');
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Image file size must be less than 5MB');
      return;
    }

    setIsUploadingAvatar(true);
    setError(null);
    try {
      const res = await chatApi.uploadAvatar(file, file.name);
      if (res.avatar) {
        setAvatar(res.avatar);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload avatar to ImageKit');
    } finally {
      setIsUploadingAvatar(false);
    }
  };
  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Display name is required');
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        username: username.trim(),
        about: about.trim(),
        phone: phone.trim(),
        avatar: avatar.trim(),
        location: location.trim(),
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#111215] border border-slate-200 dark:border-[#22242a] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-900 dark:text-[#f8fafc]"
        role="dialog"
        aria-labelledby="edit-profile-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#1e2229]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-[#1e2229] flex items-center justify-center text-slate-800 dark:text-[#f8fafc]">
              <User size={16} />
            </div>
            <div>
              <h3 id="edit-profile-title" className="text-sm font-bold tracking-tight">
                Edit User Profile
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-[#8e95a5]">
                Update your public profile and personal information
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1e2229] flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-300 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Avatar Section with ImageKit File Upload */}
          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl bg-slate-50 dark:bg-[#16181d] border border-slate-200 dark:border-[#22242a]">
            <div className="relative shrink-0 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <img
                src={avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={name || 'Avatar'}
                className="w-18 h-18 rounded-full object-cover shadow-sm ring-2 ring-slate-300 dark:ring-[#2e3340]"
              />
              <button
                type="button"
                disabled={isUploadingAvatar}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shadow-xs cursor-pointer hover:scale-110 transition-transform"
                title="Upload custom image"
              >
                {isUploadingAvatar ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/jpg"
              className="hidden"
              onChange={handleFileUpload}
            />

            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Profile Picture
                </span>
                <button
                  type="button"
                  disabled={isUploadingAvatar}
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[11px] font-semibold text-slate-900 dark:text-slate-100 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  {isUploadingAvatar ? (
                    <>
                      <Loader2 size={11} className="animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={11} />
                      <span>Upload</span>
                    </>
                  )}
                </button>
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-1.5 flex-wrap">
                {AVATAR_PRESETS.map((presetUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAvatar(presetUrl)}
                    className={`w-7 h-7 rounded-full overflow-hidden border transition-all cursor-pointer ${avatar === presetUrl
                        ? 'ring-2 ring-slate-900 dark:ring-white border-transparent scale-105'
                        : 'border-slate-300 dark:border-[#2e3340] opacity-80 hover:opacity-100'
                      }`}
                  >
                    <img src={presetUrl} alt="Preset" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-[#c4c9d4] mb-1.5 flex items-center gap-1.5">
              <User size={13} />
              <span>Full Name / Display Name</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              required
              className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-[#2a2e38] bg-white dark:bg-[#16181d] text-xs font-medium text-slate-900 dark:text-[#f8fafc] placeholder:text-slate-400 dark:placeholder:text-[#646b7a] focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-500 transition-all"
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-[#c4c9d4] mb-1.5 flex items-center gap-1.5">
              <AtSign size={13} />
              <span>Username</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 dark:text-[#646b7a]">
                @
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                placeholder="username"
                className="w-full h-10 pl-7 pr-3 rounded-xl border border-slate-300 dark:border-[#2a2e38] bg-white dark:bg-[#16181d] text-xs font-medium text-slate-900 dark:text-[#f8fafc] placeholder:text-slate-400 dark:placeholder:text-[#646b7a] focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-500 transition-all"
              />
            </div>
          </div>

          {/* About / Bio */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-[#c4c9d4] mb-1.5 flex items-center gap-1.5">
              <FileText size={13} />
              <span>About / Status Quote</span>
            </label>
            <textarea
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              placeholder="Tell others what you're working on..."
              rows={2}
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-[#2a2e38] bg-white dark:bg-[#16181d] text-xs font-medium text-slate-900 dark:text-[#f8fafc] placeholder:text-slate-400 dark:placeholder:text-[#646b7a] focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-500 transition-all resize-none"
            />
          </div>

          {/* Two-column Phone & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-[#c4c9d4] mb-1.5 flex items-center gap-1.5">
                <Phone size={13} />
                <span>Phone Number</span>
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-[#2a2e38] bg-white dark:bg-[#16181d] text-xs font-medium text-slate-900 dark:text-[#f8fafc] placeholder:text-slate-400 dark:placeholder:text-[#646b7a] focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-[#c4c9d4] mb-1.5 flex items-center gap-1.5">
                <MapPin size={13} />
                <span>Location</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="San Francisco, CA"
                className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-[#2a2e38] bg-white dark:bg-[#16181d] text-xs font-medium text-slate-900 dark:text-[#f8fafc] placeholder:text-slate-400 dark:placeholder:text-[#646b7a] focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-500 transition-all"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-[#1e2229] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-[#8e95a5] hover:bg-slate-100 dark:hover:bg-[#1e2229] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-[#090a0c] text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : success ? (
                <>
                  <Check size={13} className="text-emerald-500" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Check size={13} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;
