import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Phone,
  Video,
  ShieldCheck,
  Bell,
  BellOff,
  Trash2,
  Info,
  Lock,
  UserPlus,
  UserCheck,
  Loader2,
  Edit3,
  Camera,
} from 'lucide-react';
import { ChatItem } from './ChatList';
import { chatApi } from '../api/chatApi';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import '../style/components.css';

export interface GroupMemberInfo {
  id: string;
  name: string;
  username?: string;
  avatar?: string;
  role: 'Admin' | 'Member';
  phone?: string;
  about?: string;
}

export interface ContactDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: ChatItem | null;
  contacts?: ChatItem[];
  isOnline?: boolean;
  onStartCall?: (type: 'audio' | 'video') => void;
  onDeleteChat?: (chatId: string) => void;
  onSelectUser?: (user: { id?: string; name: string; username?: string; avatar?: string; about?: string; phone?: string }) => void;
  onAddMember?: (groupId: string, targetUserId: string) => Promise<void>;
  onRemoveMember?: (groupId: string, targetUserId: string) => Promise<void>;
  onUpdateGroupInfo?: (groupId: string, data: { name?: string; description?: string; avatar?: string }) => Promise<void>;
}

export const ContactDetailsModal: React.FC<ContactDetailsModalProps> = ({
  isOpen: _isOpen,
  onClose,
  contact,
  contacts = [],
  isOnline = false,
  onStartCall,
  onDeleteChat,
  onSelectUser,
  onAddMember,
  onRemoveMember: _onRemoveMember,
  onUpdateGroupInfo,
}) => {
  const { user } = useAuthContext();
  const currentUserId = String(user?.id || user?._id || '');

  const [isMuted, setIsMuted] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [groupMembers, setGroupMembers] = useState<GroupMemberInfo[]>([]);
  const [isGroupAdmin, setIsGroupAdmin] = useState(false);
  const [isLoadingGroupData, setIsLoadingGroupData] = useState(false);
  const [manualUserQuery, setManualUserQuery] = useState('');
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDesc, setEditGroupDesc] = useState('');
  const [editGroupAvatar, setEditGroupAvatar] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const groupAvatarInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!contact || !contact.isGroup) return;

    let isSubscribed = true;
    const timer = setTimeout(() => {
      if (isSubscribed) {
        setIsLoadingGroupData(true);
        chatApi.getRoom(contact.id).then((room) => {
          if (!isSubscribed || !room) return;
          const adminIds = Array.isArray(room.admins)
            ? room.admins.map((a: unknown) => (typeof a === 'object' && a !== null && '_id' in a ? String((a as { _id: string })._id) : String(a)))
            : [];
          const isCreator = Boolean(room.createdBy && String(room.createdBy) === currentUserId);
          const isInAdmins = adminIds.includes(currentUserId);
          const isUserAdmin = Boolean(isCreator || isInAdmins || contact.isAdmin);

          setIsGroupAdmin(isUserAdmin);
          setEditGroupName(room.roomname || contact.name);
          setEditGroupDesc(room.description || contact.statusText || '');
          setEditGroupAvatar(room.avatar || contact.avatar || '');

          const mappedMembers: GroupMemberInfo[] = Array.isArray(room.members) && room.members.length > 0
            ? room.members.map((m: unknown) => {
                if (typeof m === 'object' && m !== null) {
                  const mObj = m as { _id?: string; id?: string; name?: string; username?: string; avatar?: string; phone?: string; about?: string };
                  const mId = String(mObj._id || mObj.id || '');
                  const isMemAdmin = Boolean(mId && (mId === String(room.createdBy) || adminIds.includes(mId)));
                  return {
                    id: mId,
                    name: mObj.name || mObj.username || 'Member',
                    username: mObj.username || '',
                    avatar: mObj.avatar || '',
                    role: isMemAdmin ? 'Admin' : 'Member',
                    phone: mObj.phone || '',
                    about: mObj.about || '',
                  };
                }
                const strId = String(m);
                return {
                  id: strId,
                  name: 'Member',
                  role: adminIds.includes(strId) ? 'Admin' : 'Member',
                  avatar: '',
                  phone: '',
                  about: '',
                };
              })
            : [];

          setGroupMembers(mappedMembers);
        }).catch((err) => {
          console.warn('Failed to load group details:', err);
        }).finally(() => {
          if (isSubscribed) setIsLoadingGroupData(false);
        });
      }
    }, 0);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [contact, currentUserId]);

  const handleDelete = () => {
    if (onDeleteChat) {
      onDeleteChat(contact.id);
    }
    setShowDeleteConfirm(false);
    onClose();
  };

  const handleAddMember = async (targetUserId: string) => {
    if (!onAddMember) return;
    setIsActionLoading(true);
    setActionError(null);
    try {
      await onAddMember(contact.id, targetUserId);
      setShowAddMember(false);
      setManualUserQuery('');
      // Reload room members
      const room = await chatApi.getRoom(contact.id);
      if (room && Array.isArray(room.members)) {
        const adminIds = Array.isArray(room.admins) ? room.admins.map((a: unknown) => String((a as { _id?: string })._id || a)) : [];
        const mapped: GroupMemberInfo[] = room.members.map((m: unknown) => {
          const mObj = m as { _id?: string; name?: string; username?: string; avatar?: string; phone?: string };
          const mId = String(mObj._id || '');
          return {
            id: mId,
            name: mObj.name || mObj.username || 'Member',
            username: mObj.username || '',
            avatar: mObj.avatar || '',
            role: adminIds.includes(mId) ? 'Admin' : 'Member',
            phone: mObj.phone || '',
          };
        });
        setGroupMembers(mapped);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setIsActionLoading(false);
    }
  };
  if (!_isOpen || !contact) return null;

  const displayName = contact.name || 'User';
  const username = contact.name ? `@${contact.name.toLowerCase().replace(/[^a-z0-9]/g, '')}` : '@user';
  const aboutText = contact.statusText || contact.lastMessage || (contact.isGroup ? 'Group channel on chatSocial.' : 'Available on chatSocial.');
  const initials = contact.initials || displayName.slice(0, 2).toUpperCase();
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-details-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#111215] border border-slate-200 dark:border-[#22242a] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-900 dark:text-[#f8fafc] animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#1e2229]">
          <h3 id="contact-details-title" className="text-sm font-bold tracking-tight flex items-center gap-2">
            <Info size={16} className="text-slate-500" />
            <span>{contact.isGroup ? 'Group Information' : 'Contact Information'}</span>
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1e2229] flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close details"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Avatar & Primary Info */}
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-3.5">
              <div
                className={`w-24 h-24 rounded-full overflow-hidden shadow-md ring-4 ring-slate-100 dark:ring-[#1e2229] bg-slate-200 dark:bg-slate-800 flex items-center justify-center ${
                  contact.isGroup && isGroupAdmin ? 'cursor-pointer hover:opacity-90' : ''
                }`}
                onClick={() => {
                  if (contact.isGroup && isGroupAdmin) {
                    groupAvatarInputRef.current?.click();
                  }
                }}
                title={contact.isGroup && isGroupAdmin ? 'Click to upload group avatar' : ''}
              >
                {editGroupAvatar || contact.avatar ? (
                  <img src={editGroupAvatar || contact.avatar} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center font-bold text-white text-2xl"
                    style={{ backgroundColor: contact.avatarBg || '#475569' }}
                  >
                    {initials}
                  </div>
                )}
              </div>
              {!contact.isGroup && isOnline && (
                <span
                  className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 ring-3 ring-white dark:ring-[#111215] z-10"
                  title="Online now"
                />
              )}
              {contact.isGroup && isGroupAdmin && (
                <button
                  type="button"
                  disabled={isUploadingAvatar}
                  onClick={() => groupAvatarInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shadow-xs cursor-pointer hover:scale-105 transition-transform"
                  title="Upload group avatar"
                >
                  {isUploadingAvatar ? <Loader2 size={12} className="animate-spin" /> : <Camera size={13} />}
                </button>
              )}
            </div>

            <input
              ref={groupAvatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setIsUploadingAvatar(true);
                try {
                  const res = await chatApi.uploadAvatar(file, file.name);
                  if (res.avatar) {
                    setEditGroupAvatar(res.avatar);
                    await chatApi.updateRoom(contact.id, { avatar: res.avatar });
                    if (onUpdateGroupInfo) {
                      await onUpdateGroupInfo(contact.id, { avatar: res.avatar });
                    }
                  }
                } catch (err) {
                  console.warn(err);
                } finally {
                  setIsUploadingAvatar(false);
                }
              }}
            />

            <div className="flex items-center justify-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{editGroupName || displayName}</h2>
              {contact.isGroup && isGroupAdmin && (
                <button
                  type="button"
                  onClick={() => setShowEditGroupModal(true)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1e2229] transition-colors cursor-pointer"
                  title="Edit group details"
                >
                  <Edit3 size={14} />
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">{username}</p>

            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#1a1d24] text-[11px] font-medium text-slate-700 dark:text-slate-300">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  contact.isGroup ? 'bg-slate-400' : isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                }`}
              />
              <span>
                {contact.isGroup
                  ? `${groupMembers.length || 1} Participants`
                  : isOnline
                  ? 'Online now'
                  : 'Offline'}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              onClick={() => {
                onClose();
                if (onStartCall) onStartCall('audio');
              }}
              className="p-3 rounded-xl border border-slate-200 dark:border-[#22242a] bg-slate-50 dark:bg-[#16181d] hover:bg-slate-100 dark:hover:bg-[#1e2229] transition-all flex flex-col items-center gap-1.5 text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Phone size={16} />
              </div>
              <span className="text-[11px] font-semibold">Audio Call</span>
            </button>

            <button
              onClick={() => {
                onClose();
                if (onStartCall) onStartCall('video');
              }}
              className="p-3 rounded-xl border border-slate-200 dark:border-[#22242a] bg-slate-50 dark:bg-[#16181d] hover:bg-slate-100 dark:hover:bg-[#1e2229] transition-all flex flex-col items-center gap-1.5 text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                <Video size={16} />
              </div>
              <span className="text-[11px] font-semibold">Video Call</span>
            </button>

            <button
              onClick={() => {
                setIsMuted((prev) => !prev);
              }}
              className="p-3 rounded-xl border border-slate-200 dark:border-[#22242a] bg-slate-50 dark:bg-[#16181d] hover:bg-slate-100 dark:hover:bg-[#1e2229] transition-all flex flex-col items-center gap-1.5 text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-400 flex items-center justify-center">
                {isMuted ? <BellOff size={16} /> : <Bell size={16} />}
              </div>
              <span className="text-[11px] font-semibold">{isMuted ? 'Muted' : 'Mute'}</span>
            </button>
          </div>

          <div className="space-y-3.5 pt-2">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#16181d] border border-slate-200 dark:border-[#22242a] space-y-1">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                About & Status
              </span>
              <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed">{aboutText}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#16181d] border border-slate-200 dark:border-[#22242a] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Media Encryption</h4>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400">Mediasoup SFU WebRTC Pipeline</p>
                </div>
              </div>
              <Lock size={14} className="text-emerald-500" />
            </div>
          </div>
          {/* Group Member Management if Group Chat */}
          {contact.isGroup && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#16181d] border border-slate-200 dark:border-[#22242a] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                  <span>Group Participants ({groupMembers.length || 1})</span>
                  {isLoadingGroupData && <Loader2 size={11} className="animate-spin text-slate-400" />}
                </span>
                {onAddMember && (
                  <button
                    type="button"
                    onClick={() => setShowAddMember((prev) => !prev)}
                    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <UserPlus size={13} />
                    <span>+ Add Member</span>
                  </button>
                )}
              </div>

              {actionError && (
                <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 text-xs font-medium border border-rose-200 dark:border-rose-900">
                  {actionError}
                </div>
              )}

              {showAddMember && (
                <div className="space-y-2 p-2.5 rounded-xl bg-slate-100 dark:bg-[#12151b] border border-slate-200 dark:border-[#262c38]">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (manualUserQuery.trim()) {
                        handleAddMember(manualUserQuery.trim());
                      }
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <input
                      type="text"
                      placeholder="Username (@alice) or email..."
                      value={manualUserQuery}
                      onChange={(e) => setManualUserQuery(e.target.value)}
                      className="flex-1 h-8 px-2.5 rounded-lg border border-slate-300 dark:border-[#262c38] bg-white dark:bg-[#181c24] text-xs"
                    />
                    <button
                      type="submit"
                      disabled={isActionLoading || !manualUserQuery.trim()}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold disabled:opacity-50 cursor-pointer"
                    >
                      Add
                    </button>
                  </form>

                  {contacts && contacts.filter((c) => !c.isGroup && !groupMembers.some((gm) => gm.id === (c.targetUserId || c.id))).length > 0 && (
                    <div className="max-h-32 overflow-y-auto space-y-1 pt-1">
                      {contacts
                        .filter((c) => !c.isGroup && !groupMembers.some((gm) => gm.id === (c.targetUserId || c.id)))
                        .map((c) => (
                          <div key={c.id} className="flex items-center justify-between p-1.5 rounded-lg bg-white dark:bg-[#181c24] text-xs">
                            <div className="flex items-center gap-2">
                              <img src={c.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'} alt={c.name} className="w-5 h-5 rounded-full object-cover" />
                              <span>{c.name}</span>
                            </div>
                            <button
                              type="button"
                              disabled={isActionLoading}
                              onClick={() => handleAddMember(c.targetUserId || c.id)}
                              className="px-2.5 py-1 rounded bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-[11px] cursor-pointer"
                            >
                              Add
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* Group Members List with Avatars, Names, Usernames & Phone Numbers */}
              <div className="space-y-2 pt-1 max-h-48 overflow-y-auto">
                {groupMembers.length > 0 ? (
                  groupMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#181c24] border border-slate-200/80 dark:border-[#262c38] hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer"
                      onClick={() => {
                        if (onSelectUser) {
                          onClose();
                          onSelectUser({
                            id: member.id,
                            name: member.name,
                            username: member.username,
                            avatar: member.avatar,
                            phone: member.phone,
                            about: member.about,
                          });
                        }
                      }}
                      title={`Open chat with ${member.name}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-white text-xs" style={{ backgroundColor: '#475569' }}>
                          {member.avatar ? (
                            <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{member.name ? member.name.slice(0, 2).toUpperCase() : 'U'}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs font-semibold text-slate-900 dark:text-white truncate">{member.name}</h4>
                            {member.username && (
                              <span className="text-[10px] font-mono text-slate-400 truncate">@{member.username.replace(/^@/, '')}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10.5px] text-slate-400">
                            {member.phone && <span className="font-mono">{member.phone}</span>}
                            {member.phone && <span>•</span>}
                            <span className={member.role === 'Admin' ? 'text-emerald-500 font-bold' : ''}>{member.role}</span>
                          </div>
                        </div>
                      </div>

                      {member.role === 'Admin' ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          <ShieldCheck size={11} />
                          <span>Admin</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-slate-400">
                          <UserCheck size={11} />
                          <span>Member</span>
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-xs text-slate-400">
                    No participant list available.
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="pt-2">
            {showDeleteConfirm ? (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 space-y-2.5">
                <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                  Delete conversation with {displayName}?
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="flex-1 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                  >
                    Yes, Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full p-3 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 size={14} />
                <span>Delete Conversation</span>
              </button>
            )}

      {/* Admin Edit Group Details Modal */}
      {showEditGroupModal && contact && contact.isGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#151821] border border-slate-200 dark:border-[#262c38] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Group Information</h3>
              <button onClick={() => setShowEditGroupModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIsActionLoading(true);
                try {
                  await chatApi.updateRoom(contact.id, {
                    roomname: editGroupName.trim(),
                    description: editGroupDesc.trim(),
                    avatar: editGroupAvatar.trim(),
                  });
                  if (onUpdateGroupInfo) {
                    await onUpdateGroupInfo(contact.id, {
                      name: editGroupName.trim(),
                      description: editGroupDesc.trim(),
                      avatar: editGroupAvatar.trim(),
                    });
                  }
                  setShowEditGroupModal(false);
                } catch (err) {
                  setActionError(err instanceof Error ? err.message : 'Failed to update group information');
                } finally {
                  setIsActionLoading(false);
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Group Name</label>
                <input
                  type="text"
                  required
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-[#262c38] bg-white dark:bg-[#181c24] text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Topic / Description</label>
                <textarea
                  rows={3}
                  value={editGroupDesc}
                  onChange={(e) => setEditGroupDesc(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-[#262c38] bg-white dark:bg-[#181c24] text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditGroupModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#181c24] rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActionLoading}
                  className="px-5 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-lg shadow-sm cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactDetailsModal;
