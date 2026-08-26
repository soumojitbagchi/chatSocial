import React, { useState, useEffect } from 'react';
import { 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  ShieldCheck 
} from 'lucide-react';

export interface CallModalProps {
  contactName: string;
  avatar?: string;
  type: 'audio' | 'video';
  onEndCall: () => void;
}

export const CallModal: React.FC<CallModalProps> = ({
  contactName,
  avatar,
  type,
  onEndCall
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(type === 'audio');
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-white/10 overflow-hidden shadow-2xl flex flex-col items-center justify-between p-8 min-h-[460px] text-white">
        {/* Background Ambient Glow */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-violet-600/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header info */}
        <div className="relative z-10 text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[11px] font-mono text-emerald-400">
            <ShieldCheck size={13} />
            <span>END-TO-END ENCRYPTED</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight mt-2">{contactName}</h2>
          <p className="text-xs font-mono text-white/70">
            {type === 'video' ? 'Video Call' : 'Opus HD Voice'} • {formatDuration(callDuration)}
          </p>
        </div>

        {/* Center Avatar or Video Stream */}
        <div className="relative z-10 my-auto flex flex-col items-center">
          {type === 'video' && !isVideoOff ? (
            <div className="relative w-64 h-48 rounded-2xl overflow-hidden bg-slate-800 ring-2 ring-violet-500/50 shadow-xl flex items-center justify-center">
              <img
                src={avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&auto=format&fit=crop&q=80'}
                alt={contactName}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-medium text-white">
                Remote Video Stream (1080p)
              </div>
            </div>
          ) : (
            <div className="relative">
              <div className="w-28 h-28 rounded-full overflow-hidden ring-4 ring-violet-500/30 shadow-2xl">
                {avatar ? (
                  <img src={avatar} alt={contactName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-violet-700 flex items-center justify-center text-white font-bold text-3xl">
                    {contactName.charAt(0)}
                  </div>
                )}
              </div>
              <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 ring-4 ring-slate-900 flex items-center justify-center text-[10px]">
                ⚡
              </span>
            </div>
          )}
        </div>

        {/* Bottom Call Controls */}
        <div className="relative z-10 flex items-center gap-4">
          {/* Mute Toggle */}
          <button
            onClick={() => setIsMuted((prev) => !prev)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isMuted ? 'bg-rose-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Video Toggle */}
          <button
            onClick={() => setIsVideoOff((prev) => !prev)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isVideoOff ? 'bg-rose-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title={isVideoOff ? 'Turn on video' : 'Turn off video'}
          >
            {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
          </button>

          {/* End Call Button */}
          <button
            onClick={onEndCall}
            className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition-transform active:scale-95"
            title="End call"
          >
            <PhoneOff size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallModal;
