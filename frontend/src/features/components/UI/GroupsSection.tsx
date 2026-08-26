import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  ShieldCheck, 
  UserCheck, 
  MessageSquare, 
  X
} from 'lucide-react';
import '../style/components.css';

export interface GroupMember {
  name: string;
  role: string;
  avatar: string;
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
  onSelectGroupChat: (chatId: string) => void;
  onCreateGroup?: (newGroup: Omit<GroupItem, 'id'>) => void;
}

export const GroupsSection: React.FC<GroupsSectionProps> = ({
  groups,
  onSelectGroupChat,
  onCreateGroup
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<GroupItem | null>(groups[0] || null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  const filteredGroups = groups.filter((g) =>
    searchQuery.trim() === '' ||
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    if (onCreateGroup) {
      onCreateGroup({
        name: newGroupName.trim(),
        initials: newGroupName.trim().slice(0, 2).toUpperCase(),
        avatarBg: '#8b5cf6',
        membersCount: 1,
        description: newGroupDesc.trim() || 'No description provided.',
        lastActive: 'Just now',
        unread: 0,
        chatId: '4',
        isAdmin: true,
        members: [
          {
            name: 'You',
            role: 'Admin',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
          }
        ]
      });
    }

    setNewGroupName('');
    setNewGroupDesc('');
    setShowCreateModal(false);
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Left Groups List Sidebar */}
      <section className="w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Users size={22} className="text-violet-600 dark:text-violet-400" />
              <span>Groups</span>
            </h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3 py-1.5 rounded-full bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-violet-500/20 cursor-pointer"
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
              className="w-full h-10 pl-9 pr-4 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* Groups List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredGroups.map((grp) => {
            const isSelected = selectedGroup?.id === grp.id;
            return (
              <div
                key={grp.id}
                onClick={() => setSelectedGroup(grp)}
                className={`p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-colors ${
                  isSelected 
                    ? 'bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/60' 
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <div 
                  className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white text-sm shrink-0 shadow-sm"
                  style={{ backgroundColor: grp.avatarBg }}
                >
                  {grp.initials}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {grp.name}
                    </h4>
                    {grp.isAdmin && (
                      <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-950 px-1.5 py-0.5 rounded">
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
              </div>
            );
          })}
        </div>
      </section>

      {/* Right Group Details Area */}
      <section className="flex-1 hidden md:flex flex-col bg-white dark:bg-slate-900/60 overflow-y-auto">
        {selectedGroup ? (
          <div className="max-w-3xl w-full mx-auto p-6 md:p-8 space-y-6">
            {/* Header Banner Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 text-white shadow-lg flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-xl ring-4 ring-white/20 shadow-md"
                  style={{ backgroundColor: selectedGroup.avatarBg }}
                >
                  {selectedGroup.initials}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{selectedGroup.name}</h2>
                  <p className="text-xs text-white/80 mt-1 max-w-md">{selectedGroup.description}</p>
                </div>
              </div>

              <button
                onClick={() => onSelectGroupChat(selectedGroup.chatId)}
                className="px-5 py-2.5 rounded-xl bg-white text-violet-700 font-bold text-xs hover:bg-white/90 shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <MessageSquare size={16} />
                <span>Open Group Chat</span>
              </button>
            </div>

            {/* Group Members List */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center justify-between">
                <span>Group Members ({selectedGroup.membersCount})</span>
                <span className="text-xs font-normal text-slate-500">Encrypted Group</span>
              </h3>

              <div className="space-y-3">
                {selectedGroup.members.map((member, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-colors">
                    <div className="flex items-center gap-3">
                      <img src={member.avatar} alt={member.name} className="w-10 h-10 rounded-full object-cover shadow-sm" />
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{member.name}</h4>
                        <span className="text-[11px] text-slate-400">{member.role}</span>
                      </div>
                    </div>

                    {member.role === 'Admin' ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                        <ShieldCheck size={12} />
                        <span>Group Admin</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] text-slate-400">
                        <UserCheck size={12} />
                        <span>Member</span>
                      </span>
                    )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create New Group</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
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
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
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
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-lg shadow-md shadow-violet-500/20"
                >
                  Create Group
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
