import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Phone,
  Video,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Plus,
  Search,
  PhoneCall,
  CheckCheck,
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
  // Seen tracking for the Missed section. Missing (old cache) => unseen.
  seen?: boolean;
  isMissed?: boolean;
  otherUserId?: string;
  createdAt?: string;
}

export interface CallsSectionProps {
  calls: CallLogItem[];
  onStartCall: (name: string, type: 'audio' | 'video', avatar?: string) => void;
  // Missed section data (server-driven when available).
  missedCalls?: CallLogItem[];
  unseenMissedCount?: number;
  onMarkMissedSeen?: (ids?: string[]) => void | Promise<void>;
}

const isUnseenMissed = (call: CallLogItem) => (
  call.direction === 'missed' && call.seen !== true
);

export const CallsSection: React.FC<CallsSectionProps> = ({
  calls,
  onStartCall,
  missedCalls: missedCallsProp,
  unseenMissedCount: unseenCountProp,
  onMarkMissedSeen,
}) => {
  const [section, setSection] = useState<'all' | 'missed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewCallModal, setShowNewCallModal] = useState(false);
  const [targetCallInput, setTargetCallInput] = useState('');
  const seenTimer = useRef<number | null>(null);

  // Missed section: prefer server list, fall back to local derivation.
  const missedCalls = useMemo(() => {
    if (missedCallsProp) return missedCallsProp;
    return calls.filter((c) => c.direction === 'missed');
  }, [missedCallsProp, calls]);

  const unseenMissedCount = useMemo(() => {
    if (typeof unseenCountProp === 'number') return unseenCountProp;
    return missedCalls.filter(isUnseenMissed).length;
  }, [unseenCountProp, missedCalls]);

  // Opening the Missed section marks it seen (debounced so the
  // red state is visible first, then clears).
  useEffect(() => {
    if (section !== 'missed' || unseenMissedCount === 0 || !onMarkMissedSeen) return;
    if (seenTimer.current) window.clearTimeout(seenTimer.current);
    seenTimer.current = window.setTimeout(() => {
      void onMarkMissedSeen();
    }, 900);
    return () => {
      if (seenTimer.current) window.clearTimeout(seenTimer.current);
    };
  }, [section, unseenMissedCount, onMarkMissedSeen]);

  const visibleCalls = useMemo(() => {
    const source = section === 'missed' ? missedCalls : calls;
    const query = searchQuery.trim().toLowerCase();
    const filtered = query
      ? source.filter((c) => c.name.toLowerCase().includes(query))
      : source;
    // Unseen missed float to the top in both sections.
    return [...filtered].sort((a, b) => (
      Number(isUnseenMissed(b)) - Number(isUnseenMissed(a))
    ));
  }, [section, missedCalls, calls, searchQuery]);

  const handleStartCustomCall = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCallInput.trim()) return;
    onStartCall(targetCallInput.trim(), 'audio');
    setTargetCallInput('');
    setShowNewCallModal(false);
  };

  const renderRow = (call: CallLogItem) => {
    const unseen = isUnseenMissed(call);
    return (
      <div
        key={call.id}
        className={`p-3 rounded-xl flex items-center justify-between transition-colors hover:bg-slate-50 dark:hover:bg-[#161922] ${unseen ? 'bg-rose-50/60 dark:bg-rose-950/20' : ''}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <img
              src={call.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt={call.name}
              className="w-11 h-11 rounded-full object-cover shadow-sm"
            />
            {unseen && (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-rose-600 ring-2 ring-white dark:ring-[#12151b]" title="Unseen missed call" />
            )}
          </div>
          <div className="min-w-0">
            <h4 className={`text-sm font-semibold truncate ${unseen ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
              {call.name}
            </h4>
            <div className={`flex items-center gap-1.5 text-xs mt-0.5 ${unseen ? 'text-rose-500 dark:text-rose-400 font-medium' : 'text-slate-400'}`}>
              {call.direction === 'incoming' && <PhoneIncoming size={12} className="text-emerald-500" />}
              {call.direction === 'outgoing' && <PhoneOutgoing size={12} className="text-emerald-500" />}
              {call.direction === 'missed' && <PhoneMissed size={12} className="text-rose-500" />}
              <span>{unseen ? `Missed • ${call.time}` : call.time}</span>
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
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
            title={`Call ${call.name}`}
          >
            {call.type === 'video' ? <Video size={16} /> : <Phone size={15} />}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-slate-50 dark:bg-[#0b0d11]">
      <section className="w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-[#1e222a] bg-white dark:bg-[#12151b] flex flex-col shrink-0" aria-label="Call history">
        <div className="p-4 border-b border-slate-100 dark:border-[#181b22]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Phone size={22} className="text-slate-800 dark:text-slate-200" />
              <span>Calls</span>
              {unseenMissedCount > 0 && (
                <span className="min-w-5 h-5 px-1.5 rounded-full bg-rose-600 text-white text-[11px] font-bold flex items-center justify-center" title={`${unseenMissedCount} unseen missed calls`}>
                  {unseenMissedCount > 99 ? '99+' : unseenMissedCount}
                </span>
              )}
            </h2>
            <button
              onClick={() => setShowNewCallModal(true)}
              className="px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 dark:bg-[#f8fafc] dark:hover:bg-slate-200 text-white dark:text-[#080a0e] text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>New Call</span>
            </button>
          </div>

          <div className="relative mb-3">
            <input
              type="text"
              placeholder="Search call history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-xl bg-slate-100 dark:bg-[#181c24] border border-slate-200/80 dark:border-[#262c38] text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400"
            />
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="flex items-center gap-2" role="tablist" aria-label="Call history sections">
            <button
              role="tab"
              aria-selected={section === 'all'}
              onClick={() => setSection('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                section === 'all'
                  ? 'bg-slate-900 text-white dark:bg-[#f8fafc] dark:text-[#080a0e]'
                  : 'bg-slate-100 dark:bg-[#181c24] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#202530]'
              }`}
            >
              All Calls
            </button>
            <button
              role="tab"
              aria-selected={section === 'missed'}
              onClick={() => setSection('missed')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                section === 'missed'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-100 dark:bg-[#181c24] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#202530]'
              }`}
            >
              <span>Missed</span>
              {unseenMissedCount > 0 && (
                <span className={`min-w-5 h-5 px-1 rounded-full text-[11px] font-bold flex items-center justify-center ${section === 'missed' ? 'bg-white text-rose-600' : 'bg-rose-600 text-white'}`}>
                  {unseenMissedCount > 99 ? '99+' : unseenMissedCount}
                </span>
              )}
            </button>
            {section === 'missed' && unseenMissedCount > 0 && onMarkMissedSeen && (
              <button
                onClick={() => void onMarkMissedSeen()}
                className="ml-auto px-2 py-1 rounded-lg text-[11px] font-semibold text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40 flex items-center gap-1 cursor-pointer"
                title="Mark all missed calls as seen"
              >
                <CheckCheck size={13} />
                <span>Mark seen</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1" role="tabpanel">
          {section === 'missed' && (
            <p className="px-2 pt-1 pb-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Missed calls {missedCalls.length > 0 && <span className="normal-case font-medium">({missedCalls.length})</span>}
            </p>
          )}
          {section === 'all' && (
            <p className="px-2 pt-1 pb-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              All calls {calls.length > 0 && <span className="normal-case font-medium">({calls.length})</span>}
            </p>
          )}
          {visibleCalls.length === 0 ? (
            <div className="text-center py-10 px-4 space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-[#181c24] text-slate-600 dark:text-slate-300 mx-auto flex items-center justify-center">
                <Phone size={18} />
              </div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {section === 'missed' ? 'No missed calls' : 'No call history'}
              </p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                {section === 'missed'
                  ? 'Missed calls will appear here in red until you see them.'
                  : 'Start an audio or video call with your contacts anytime.'}
              </p>
            </div>
          ) : (
            visibleCalls.map(renderRow)
          )}
        </div>
      </section>

      <section className="flex-1 hidden md:flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-900/60 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center mb-4 shadow-sm">
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
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-semibold text-xs flex items-center gap-2 shadow-sm cursor-pointer"
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
                <Phone size={18} className="text-slate-800 dark:text-slate-200" />
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
                  className="w-full h-10 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400"
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
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
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
