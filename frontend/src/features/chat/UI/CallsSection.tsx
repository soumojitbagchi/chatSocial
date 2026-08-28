import React, { useState } from 'react';
import { 
  Phone, 
  Video, 
  PhoneIncoming, 
  PhoneOutgoing, 
  PhoneMissed, 
  Plus, 
  Search, 
  PhoneCall,
  X
} from 'lucide-react';
import '../style/components.css';

export interface CallLogItem {
  id: string;
  name: string;
  avatar: string;
  type: 'video' | 'audio';
  direction: 'incoming' | 'outgoing' | 'missed';
  status: 'completed' | 'missed';
  duration: string;
  time: string;
}

export interface CallsSectionProps {
  calls: CallLogItem[];
  onStartCall: (name: string, type: 'audio' | 'video', avatar?: string) => void;
}

export const CallsSection: React.FC<CallsSectionProps> = ({
  calls,
  onStartCall
}) => {
  const [filter, setFilter] = useState<'all' | 'missed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewCallModal, setShowNewCallModal] = useState(false);
  const [targetCallInput, setTargetCallInput] = useState('');

  const filteredCalls = calls.filter((c) => {
    const matchesSearch = 
      searchQuery.trim() === '' || 
      c.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === 'missed') return c.direction === 'missed';
    return true;
  });

  const handleStartCustomCall = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCallInput.trim()) return;
    onStartCall(targetCallInput.trim(), 'audio');
    setTargetCallInput('');
    setShowNewCallModal(false);
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      <section className="w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Phone size={22} className="text-violet-600 dark:text-violet-400" />
              <span>Calls</span>
            </h2>
            <button
              onClick={() => setShowNewCallModal(true)}
              className="px-3 py-1.5 rounded-full bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-violet-500/20 cursor-pointer"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>New Call</span>
            </button>
          </div>

          <div className="relative mb-3">
            <input
              type="text"
              placeholder="Search call logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filter === 'all'
                  ? 'bg-violet-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              All Calls
            </button>
            <button
              onClick={() => setFilter('missed')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filter === 'missed'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Missed Calls
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredCalls.length === 0 ? (
            <div className="text-center py-10 px-4 space-y-2">
              <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 mx-auto flex items-center justify-center">
                <Phone size={18} />
              </div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No call history</p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">Start an audio or video call with your contacts anytime.</p>
            </div>
          ) : (
            filteredCalls.map((call) => {
              const isMissed = call.direction === 'missed';
              return (
                <div
                  key={call.id}
                  className="p-3 rounded-xl flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={call.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                      alt={call.name}
                      className="w-11 h-11 rounded-full object-cover shadow-sm shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className={`text-sm font-semibold truncate ${isMissed ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                        {call.name}
                      </h4>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                        {call.direction === 'incoming' && <PhoneIncoming size={12} className="text-emerald-500" />}
                        {call.direction === 'outgoing' && <PhoneOutgoing size={12} className="text-emerald-500" />}
                        {call.direction === 'missed' && <PhoneMissed size={12} className="text-rose-500" />}
                        <span>{call.time}</span>
                        {call.duration !== '0s' && (
                          <>
                            <span>•</span>
                            <span>{call.duration}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                      onClick={() => onStartCall(call.name, call.type, call.avatar)}
                      className="w-8 h-8 rounded-full bg-violet-50 dark:bg-violet-950/60 hover:bg-violet-100 dark:hover:bg-violet-900 text-violet-600 dark:text-violet-400 flex items-center justify-center transition-colors cursor-pointer"
                      title={`Call ${call.name}`}
                    >
                      {call.type === 'video' ? <Video size={16} /> : <Phone size={15} />}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="flex-1 hidden md:flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-900/60 text-center">
        <div className="w-16 h-16 rounded-2xl bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-4 shadow-sm">
          <PhoneCall size={32} />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Encrypted Voice & Video Calling
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md leading-relaxed mb-6">
          High-definition Opus audio with real-time WebRTC peer connections protected by end-to-end encryption.
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNewCallModal(true)}
            className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs flex items-center gap-2 shadow-md shadow-violet-500/25 cursor-pointer"
          >
            <Phone size={15} />
            <span>Start Voice Call</span>
          </button>
        </div>
      </section>

      {showNewCallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Phone size={18} className="text-violet-600" />
                <span>Start Direct Voice Call</span>
              </h3>
              <button
                onClick={() => setShowNewCallModal(false)}
                className="w-7 h-7 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleStartCustomCall} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  User ID or Contact Name
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="Enter User ID or name..."
                  value={targetCallInput}
                  onChange={(e) => setTargetCallInput(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewCallModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-violet-500/20 cursor-pointer"
                >
                  <Phone size={14} />
                  <span>Call Now</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallsSection;
