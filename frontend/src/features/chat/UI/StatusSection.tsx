import React from 'react';
import { 
  CircleDashed, 
  Camera, 
  Sparkles, 
  Lock,
  ChevronRight
} from 'lucide-react';
import '../style/components.css';

export interface StatusItem {
  id: string;
  userName: string;
  time: string;
  avatar: string;
  isMe?: boolean;
  hasStory: boolean;
  storiesCount?: number;
  storyImage?: string;
  caption?: string;
}

export interface StatusSectionProps {
  statusUpdates: StatusItem[];
  onViewStory: (status: StatusItem) => void;
  onAddStory?: () => void;
}

export const StatusSection: React.FC<StatusSectionProps> = ({
  statusUpdates,
  onViewStory,
  onAddStory
}) => {
  const myStatus = statusUpdates.find((s) => s.isMe) || {
    id: 'my-status-init',
    userName: 'My Status',
    time: 'Tap to add status update',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    hasStory: false,
    isMe: true,
  };
  const recentUpdates = statusUpdates.filter((s) => !s.isMe);
  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-slate-50 dark:bg-[#0b0d11]">
      <section className="w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-[#1e222a] bg-white dark:bg-[#12151b] flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-100 dark:border-[#181b22]">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <CircleDashed size={22} className="text-slate-800 dark:text-slate-200" />
              <span>Status</span>
            </h2>
            <button
              onClick={onAddStory}
              className="px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 dark:bg-[#f8fafc] dark:hover:bg-slate-200 text-white dark:text-[#080a0e] text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
            >
              <Camera size={14} />
              <span>Add Status</span>
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Status updates disappear after 24 hours.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          <div 
            onClick={onAddStory}
            className="p-3 rounded-2xl bg-slate-100/70 dark:bg-[#181c24] border border-slate-200 dark:border-[#262c38] flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-[#1d222c] transition-colors"
          >
            <div className="relative">
              <img
                src={myStatus.avatar}
                alt="My Status"
                className="w-12 h-12 rounded-full object-cover shadow-sm"
              />
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center text-xs font-bold ring-2 ring-white dark:ring-[#12151b]">
                +
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">My Status</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Tap to add status update</p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
              Recent Updates
            </h4>
            {recentUpdates.length === 0 ? (
              <p className="text-xs text-slate-400 p-3 bg-slate-50 dark:bg-[#181c24] rounded-xl border border-slate-200/60 dark:border-[#262c38]">
                No status updates from contacts yet.
              </p>
            ) : (
              recentUpdates.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onViewStory(item)}
                  className="p-3 rounded-xl flex items-center justify-between hover:bg-slate-50 dark:hover:bg-[#161922] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative p-0.5 rounded-full bg-slate-400 dark:bg-slate-600">
                      <img
                        src={item.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                        alt={item.userName}
                        className="w-11 h-11 rounded-full object-cover border-2 border-white dark:border-[#12151b]"
                      />
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {item.userName}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">{item.time}</p>
                    </div>
                  </div>

                  <ChevronRight size={16} className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all" />
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="flex-1 hidden md:flex flex-col items-center justify-center p-8 bg-white dark:bg-[#0b0d11] text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-[#181c24] text-slate-700 dark:text-slate-300 flex items-center justify-center mb-4 shadow-sm border border-slate-200 dark:border-[#262c38]">
          <Sparkles size={32} />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Real-time Encrypted Stories
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md leading-relaxed mb-6">
          Share quick glimpses of your day, photos, code snippets, and voice clips securely with your trusted contacts.
        </p>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <Lock size={13} className="text-emerald-500" />
          <span>Zero-Knowledge Encrypted Statuses</span>
        </div>
      </section>
    </div>
  );
};

export default StatusSection;
