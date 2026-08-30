import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  ShieldCheck, 
  UserCheck, 
  MessageSquare, 
  UserPlus,
  Trash2,
  Check,
  X
} from 'lucide-react';
import { ChatItem } from './ChatList';
import { chatApi } from '../api/chatApi';
import '../style/components.css';

export interface GroupMember {
  id?: string;
  name: string;
  username?: string;
  role: string;
  avatar: string;
  about?: string;
}

export interface GroupItem {
  id: string;
  name: string;
  initials: string;
  avatarBg: string;
  membersCount: number;
  description: string;
  lastActive: string;
  unread: number;
  chatId: string;
  isAdmin: boolean;
  members: GroupMember[];
}

export interface GroupsSectionProps {
  groups: GroupItem[];
  contacts?: ChatItem[];
  onSelectGroupChat: (chatId: string) => void;
  onSelectUser?: (user: { id?: string; name: string; username?: string; avatar?: string; about?: string }) => void;
  onCreateGroup?: (newGroup: Omit<GroupItem, 'id'> & { memberIds?: string[] }) => void;
  onAddMember?: (groupId: string, targetUserId: string) => Promise<void>;
  onRemoveMember?: (groupId: string, targetUserId: string) => Promise<void>;
  onUpdateGroupInfo?: (groupId: string, data: { name?: string; description?: string; avatar?: string }) => Promise<void>;
}

export const GroupsSection: React.FC<GroupsSectionProps> = ({
  groups,
  contacts = [],
  onSelectGroupChat,
  onSelectUser,
  onCreateGroup,
  onAddMember,
  onRemoveMember,
  onUpdateGroupInfo,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<GroupItem | null>(groups[0] || null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDesc, setEditGroupDesc] = useState('');
  const [editGroupAvatar, setEditGroupAvatar] = useState('');
  const [isUploadingGroupAvatar, setIsUploadingGroupAvatar] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberActionError, setMemberActionError] = useState<string | null>(null);
  const [isPerformingAction, setIsPerformingAction] = useState(false);
  const [manualUserQuery, setManualUserQuery] = useState('');
  const groupAvatarInputRef = React.useRef<HTMLInputElement>(null);
  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return groups.filter((g) =>
      q === '' ||
      g.name.toLowerCase().includes(q) ||
      g.description.toLowerCase().includes(q)
    );
  }, [groups, searchQuery]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    if (onCreateGroup) {
      onCreateGroup({
        name: newGroupName.trim(),
        initials: newGroupName.trim().slice(0, 2).toUpperCase(),
        avatarBg: '#6f7771',
        membersCount: 1 + selectedMemberIds.length,
        description: newGroupDesc.trim() || 'No description provided.',
        lastActive: 'Just now',
        unread: 0,
        chatId: '',
        isAdmin: true,
        memberIds: selectedMemberIds,
        members: [
          {
            name: 'You',
            role: 'Admin',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
          },
        ],
      });
    }

    setNewGroupName('');
    setNewGroupDesc('');
    setSelectedMemberIds([]);
    setShowCreateModal(false);
  };

  const handleAddUserToGroup = async (targetUserId: string) => {
    if (!selectedGroup || !onAddMember) return;
    setIsPerformingAction(true);
    setMemberActionError(null);
    try {
      await onAddMember(selectedGroup.id, targetUserId);
      setShowAddMemberModal(false);
    } catch (err) {
      setMemberActionError(err instanceof Error ? err.message : 'Failed to add member to group');
    } finally {
      setIsPerformingAction(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-slate-50 dark:bg-[#0b0d11]">
      <section className="w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-[#1e222a] bg-white dark:bg-[#12151b] flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-100 dark:border-[#181b22]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Users size={22} className="text-slate-800 dark:text-slate-200" />
              <span>Groups</span>
            </h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 dark:bg-[#f8fafc] dark:hover:bg-slate-200 text-white dark:text-[#080a0e] text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>New Group</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search groups or topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-xl bg-slate-100 dark:bg-[#181c24] border border-slate-200/80 dark:border-[#262c38] text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400"
            />
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* Groups List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredGroups.length === 0 ? (
            <div className="text-center py-10 px-4 space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-[#181c24] text-slate-600 dark:text-slate-300 mx-auto flex items-center justify-center">
                <Users size={18} />
              </div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No rooms or groups yet</p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">Create a new group on the server to collaborate with members!</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-2 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-[#f8fafc] dark:hover:bg-slate-200 text-white dark:text-[#080a0e] text-xs font-semibold shadow-sm cursor-pointer"
              >
                + Create Group
              </button>
            </div>
          ) : (
            filteredGroups.map((grp) => {
              const isSelected = selectedGroup?.id === grp.id;
              return (
                <button
                  key={grp.id}
                  onClick={() => setSelectedGroup(grp)}
                  type="button"
                  className={`w-full p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-colors text-left ${
                    isSelected 
                      ? 'bg-slate-100 dark:bg-[#1a1e27] border border-slate-300/80 dark:border-[#262b37]' 
                      : 'hover:bg-slate-50 dark:hover:bg-[#161922] border border-transparent'
                  }`}
                >
                  <div 
                    className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white text-sm shrink-0 shadow-sm"
                    style={{ backgroundColor: grp.avatarBg || '#475569' }}
                  >
                    {grp.initials}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {grp.name}
                      </h4>
                      {grp.isAdmin && (
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 bg-slate-200/80 dark:bg-[#181c24] px-1.5 py-0.5 rounded">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {grp.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                      <span>{grp.membersCount} members</span>
                      <span>•</span>
                      <span>{grp.lastActive}</span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </section>

      <section className="flex-1 hidden md:flex flex-col bg-white dark:bg-[#0b0d11] overflow-y-auto">
        {selectedGroup ? (
          <div className="max-w-3xl w-full mx-auto p-6 md:p-8 space-y-6">
            <div className="p-6 rounded-2xl bg-[#151821] text-white shadow-md flex items-center justify-between border border-[#222734]">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div 
                  className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center font-bold text-xl ring-4 ring-white/10 shadow-md shrink-0 bg-slate-800"
                  style={{ backgroundColor: selectedGroup.avatarBg || '#334155' }}
                >
                  {selectedGroup.avatar ? (
                    <img src={selectedGroup.avatar} alt={selectedGroup.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{selectedGroup.initials}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold truncate">{selectedGroup.name}</h2>
                    {selectedGroup.isAdmin && onUpdateGroupInfo && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditGroupName(selectedGroup.name);
                          setEditGroupDesc(selectedGroup.description);
                          setEditGroupAvatar(selectedGroup.avatar || '');
                          setShowEditGroupModal(true);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        title="Edit group details & avatar"
                      >
                        <UserPlus size={14} className="hidden" />
                        <span className="text-xs text-slate-400 hover:text-white underline">Edit</span>
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 mt-1 max-w-md truncate">{selectedGroup.description}</p>
                </div>
              </div>

              <button
                onClick={() => onSelectGroupChat(selectedGroup.chatId)}
                className="px-5 py-2.5 rounded-xl bg-white text-slate-900 font-bold text-xs hover:bg-slate-100 shadow-sm transition-all flex items-center gap-2 cursor-pointer shrink-0 ml-3"
              >
                <MessageSquare size={16} />
                <span>Open Group Chat</span>
              </button>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#12151b] border border-slate-200 dark:border-[#1e222a]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users size={16} className="text-slate-500" />
                  <span>Group Members ({selectedGroup.membersCount || selectedGroup.members.length})</span>
                </h3>
                <div className="flex items-center gap-2">
                  {selectedGroup.isAdmin && onAddMember && (
                    <button
                      type="button"
                      onClick={() => setShowAddMemberModal(true)}
                      className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <UserPlus size={13} />
                      <span>Add Member</span>
                    </button>
                  )}
                  {selectedGroup.isAdmin && (
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                      <ShieldCheck size={12} />
                      <span>Admin</span>
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                {selectedGroup.members.map((member, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white dark:hover:bg-[#181c24] transition-colors border border-transparent hover:border-slate-200 dark:hover:border-[#222734]">
                    <div 
                      className="flex items-center gap-3 cursor-pointer hover:opacity-90 flex-1 min-w-0"
                      onClick={() => onSelectUser && onSelectUser(member)}
                      title={`Open chat with ${member.name}`}
                    >
                      <img src={member.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'} alt={member.name} className="w-10 h-10 rounded-full object-cover shadow-sm" />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{member.name}</h4>
                        <span className="text-[11px] text-slate-400">{member.role}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {member.role === 'Admin' ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          <ShieldCheck size={12} />
                          <span>Admin</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] text-slate-400">
                          <UserCheck size={12} />
                          <span>Member</span>
                        </span>
                      )}

                      {selectedGroup.isAdmin && member.role !== 'Admin' && onRemoveMember && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (window.confirm(`Remove ${member.name} from group?`)) {
                              await onRemoveMember(selectedGroup.id, member.name);
                            }
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Remove member"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            Select a group to see members and details.
          </div>
        )}
      </section>

      {/* Create New Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#151821] border border-slate-200 dark:border-[#262c38] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create New Group</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Design Systems & Core Team"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-[#262c38] bg-white dark:bg-[#181c24] text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Topic / Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe the purpose of this group..."
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-[#262c38] bg-white dark:bg-[#181c24] text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400"
                />
              </div>

              {contacts && contacts.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  </label>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 rounded-xl border border-slate-200 dark:border-[#262c38] bg-slate-50 dark:bg-[#12151b]">
                    {contacts.filter(c => !c.isGroup).map((c) => {
                      const isSelected = selectedMemberIds.includes(c.targetUserId || c.id);
                      return (
                        <div
                          key={c.id}
                          onClick={() => {
                            const targetId = c.targetUserId || c.id;
                            setSelectedMemberIds((prev) =>
                              isSelected ? prev.filter((id) => id !== targetId) : [...prev, targetId]
                            );
                          }}
                          className={`p-2 rounded-lg flex items-center justify-between text-xs font-medium cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                              : 'hover:bg-slate-200/60 dark:hover:bg-[#1a1d24] text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <img src={c.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'} alt={c.name} className="w-6 h-6 rounded-full object-cover" />
                            <span>{c.name}</span>
                          </div>
                          {isSelected && <Check size={14} />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#181c24] rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 dark:bg-[#f8fafc] dark:hover:bg-slate-200 text-white dark:text-[#080a0e] rounded-lg shadow-sm cursor-pointer"
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Add Member Modal */}
      {showAddMemberModal && selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#151821] border border-slate-200 dark:border-[#262c38] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus size={18} className="text-emerald-500" />
                <span>Add Member to Group</span>
              </h3>
              <button onClick={() => setShowAddMemberModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {memberActionError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-300 text-xs font-medium">
                {memberActionError}
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (manualUserQuery.trim()) {
                  handleAddUserToGroup(manualUserQuery.trim());
                  setManualUserQuery('');
                }
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Enter username (e.g. @alice) or email..."
                value={manualUserQuery}
                onChange={(e) => setManualUserQuery(e.target.value)}
                className="flex-1 h-9 px-3 rounded-lg border border-slate-300 dark:border-[#262c38] bg-slate-50 dark:bg-[#181c24] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
              <button
                type="submit"
                disabled={isPerformingAction || !manualUserQuery.trim()}
                className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-bold disabled:opacity-50 cursor-pointer"
              >
                Add
              </button>
            </form>

            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 pt-1">
              Or select from your connected contacts:
            </p>
            <div className="max-h-48 overflow-y-auto space-y-1.5 p-1">
              {contacts && contacts.filter(c => !c.isGroup).length > 0 ? (
                contacts.filter(c => !c.isGroup).map((c) => (
                  <div
                    key={c.id}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-[#262c38] bg-slate-50 dark:bg-[#12151b] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <img src={c.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'} alt={c.name} className="w-8 h-8 rounded-full object-cover" />
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white">{c.name}</h4>
                        <p className="text-[10.5px] text-slate-400">{c.statusText || 'Connected'}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isPerformingAction}
                      onClick={() => handleAddUserToGroup(c.targetUserId || c.id)}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold text-xs shadow-xs cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-slate-400">
                  No contacts available to add. Connect with users first!
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowAddMemberModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#181c24] rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Admin Edit Group Details Modal */}
      {showEditGroupModal && selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#151821] border border-slate-200 dark:border-[#262c38] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Group Information</h3>
              <button onClick={() => setShowEditGroupModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Group Avatar Upload */}
            <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-[#12151b] border border-slate-200 dark:border-[#262c38]">
              <div className="relative cursor-pointer" onClick={() => groupAvatarInputRef.current?.click()}>
                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-800 flex items-center justify-center font-bold text-white text-lg">
                  {editGroupAvatar ? (
                    <img src={editGroupAvatar} alt="Group Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>{selectedGroup.initials}</span>
                  )}
                </div>
              </div>
              <input
                ref={groupAvatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setIsUploadingGroupAvatar(true);
                  try {
                    const res = await chatApi.uploadAvatar(file, file.name);
                    if (res.avatar) {
                      setEditGroupAvatar(res.avatar);
                    }
                  } catch (err) {
                    console.warn(err);
                  } finally {
                    setIsUploadingGroupAvatar(false);
                  }
                }}
              />
              <div className="space-y-1">
                <button
                  type="button"
                  disabled={isUploadingGroupAvatar}
                  onClick={() => groupAvatarInputRef.current?.click()}
                  className="text-xs font-bold text-slate-900 dark:text-white underline hover:opacity-80 cursor-pointer"
                >
                  {isUploadingGroupAvatar ? 'Uploading to ImageKit...' : 'Upload Group Avatar'}
                </button>
                <p className="text-[10.5px] text-slate-400">PNG, JPG, WebP up to 5MB</p>
              </div>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (onUpdateGroupInfo && selectedGroup) {
                  await onUpdateGroupInfo(selectedGroup.id, {
                    name: editGroupName.trim(),
                    description: editGroupDesc.trim(),
                    avatar: editGroupAvatar.trim(),
                  });
                  setShowEditGroupModal(false);
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
  );
};

export default GroupsSection;
