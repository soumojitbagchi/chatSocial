import React, { useState } from 'react';
import { X, Search, UserPlus, MessageSquare } from 'lucide-react';
import { ChatItem } from './ChatList';

export interface NewChatModalProps {
  contacts: ChatItem[];
  onSelectContact: (id: string) => void;
  onClose: () => void;
  onCreateNewContact?: (name: string) => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  contacts,
  onSelectContact,
  onClose,
  onCreateNewContact
}) => {
  const [search, setSearch] = useState('');
  const [customName, setCustomName] = useState('');
  const [showAddCustom, setShowAddCustom] = useState(false);

  const filtered = contacts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    if (onCreateNewContact) {
      onCreateNewContact(customName.trim());
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MessageSquare size={18} className="text-violet-600" />
            <span>Start New Conversation</span>
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-3 border-b border-slate-100 dark:border-slate-800">
          <div className="relative">
            <input
              type="text"
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {showAddCustom ? (
          <form onSubmit={handleCreateCustom} className="p-3 bg-violet-50 dark:bg-violet-950/30 border-b border-violet-100 dark:border-violet-900 flex items-center gap-2">
            <input
              type="text"
              autoFocus
              placeholder="Enter contact name..."
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="flex-1 h-9 px-3 rounded-lg border border-violet-200 dark:border-violet-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 cursor-pointer"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setShowAddCustom(false)}
              className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            onClick={() => setShowAddCustom(true)}
            className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-950/20 transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-600 flex items-center justify-center">
              <UserPlus size={16} />
            </div>
            <span>Add New Contact by Name</span>
          </button>
        )}

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Contacts ({filtered.length})
          </div>

          {filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => {
                onSelectContact(c.id);
                onClose();
              }}
              className="p-2.5 rounded-xl flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-sm">
                  {c.avatar ? (
                    <img src={c.avatar} alt={c.name} className="w-full h-full object-cover" />
                  ) : (
                    <div 
                      className="w-full h-full flex items-center justify-center font-bold text-white text-sm"
                      style={{ backgroundColor: c.avatarBg || '#7c3aed' }}
                    >
                      {c.initials || c.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                {c.online && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{c.name}</h4>
                <p className="text-[11px] text-slate-400 truncate">{c.statusText || c.lastMessage}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NewChatModal;
