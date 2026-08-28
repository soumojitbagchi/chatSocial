import React, { useState, useEffect } from 'react';
import { 
  PhoneOff, 
  Phone,
  Mic, 
  MicOff, 
  ShieldCheck,
  Volume2
} from 'lucide-react';

export interface CallModalProps {
  contactName: string;
  avatar?: string;
  type: 'audio' | 'video';
  status?: 'idle' | 'calling' | 'ringing' | 'connected' | 'ended' | 'rejected' | 'busy' | 'error';
  statusMessage?: string;
  direction?: 'incoming' | 'outgoing';
  isMuted?: boolean;
  onAcceptCall?: () => void;
  onRejectCall?: () => void;
  onEndCall: () => void;
  onToggleMute?: () => void;
}

export const CallModal: React.FC<CallModalProps> = ({
  contactName,
  avatar,
  type = 'audio',
  status = 'calling',
  statusMessage,
  direction = 'outgoing',
  isMuted = false,
  onAcceptCall,
  onRejectCall,
  onEndCall,
  onToggleMute,
}) => {
  const [callDuration, setCallDuration] = useState(0);

  const isConnected = status === 'connected';
  const isIncomingRinging = direction === 'incoming' && status === 'ringing';
  const isOutgoingCalling = direction === 'outgoing' && (status === 'calling' || status === 'ringing');
  const isEndedOrRejected = status === 'ended' || status === 'rejected' || status === 'error';

  useEffect(() => {
    if (!isConnected) return;
    const timer = window.setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => {
      window.clearInterval(timer);
      setCallDuration(0);
    };
  }, [isConnected]);

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getSubStatusText = () => {
    if (statusMessage) return statusMessage;
    if (isConnected) return `${type === 'video' ? 'Video Call' : 'Opus HD Voice'} • ${formatDuration(callDuration)}`;
    if (isIncomingRinging) return `Incoming ${type === 'video' ? 'Video' : 'Voice'} Call...`;
    if (isOutgoingCalling) return 'Ringing...';
    if (status === 'rejected') return 'Call Declined';
    if (status === 'ended') return 'Call Ended';
    return `${type === 'video' ? 'Video' : 'Voice'} Call`;
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-white/10 overflow-hidden shadow-2xl flex flex-col items-center justify-between p-8 min-h-[460px] text-white">
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-violet-600/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[11px] font-mono text-emerald-400">
            <ShieldCheck size={13} />
            <span>END-TO-END ENCRYPTED</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight mt-2">{contactName}</h2>
          <p className="text-xs font-mono text-white/80 font-medium">
            {getSubStatusText()}
          </p>
        </div>

        <div className="relative z-10 my-auto flex flex-col items-center">
          <div className="relative flex items-center justify-center">
            {(isOutgoingCalling || isIncomingRinging) && (
              <>
                <div className="absolute w-36 h-36 rounded-full bg-violet-500/20 animate-ping" />
                <div className="absolute w-44 h-44 rounded-full bg-violet-500/10 animate-pulse" />
              </>
            )}
            {isConnected && (
              <div className="absolute w-36 h-36 rounded-full bg-emerald-500/20 animate-pulse" />
            )}

            <div className="relative w-28 h-28 rounded-full overflow-hidden ring-4 ring-violet-500/40 shadow-2xl bg-slate-800 flex items-center justify-center">
              {avatar ? (
                <img src={avatar} alt={contactName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-violet-700 flex items-center justify-center text-white font-bold text-3xl">
                  {contactName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <span className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full ring-4 ring-slate-900 flex items-center justify-center text-xs shadow-md ${
              isConnected ? 'bg-emerald-500 text-white' : isEndedOrRejected ? 'bg-rose-500 text-white' : 'bg-violet-600 text-white'
            }`}>
              {isConnected ? <Volume2 size={13} /> : <Phone size={13} />}
            </span>
          </div>

          <div className="mt-4 px-3 py-1 rounded-full bg-slate-800/80 border border-white/5 text-[11px] font-medium text-slate-300">
            {status === 'connected' ? (
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Audio Connected
              </span>
            ) : status === 'calling' ? (
              <span>Calling recipient...</span>
            ) : status === 'ringing' ? (
              <span className="text-violet-300">Ringing...</span>
            ) : (
              <span>{statusMessage || 'Connecting...'}</span>
            )}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-6">
          {isIncomingRinging ? (
            <>
              <button
                onClick={onRejectCall || onEndCall}
                className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition-transform active:scale-95 cursor-pointer"
                title="Decline call"
              >
                <PhoneOff size={24} />
              </button>

              <button
                onClick={onAcceptCall}
                className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-600/40 transition-transform active:scale-95 animate-bounce cursor-pointer"
                title="Accept voice call"
              >
                <Phone size={28} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onToggleMute}
                disabled={isEndedOrRejected}
                className={`w-13 h-13 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  isMuted ? 'bg-rose-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
                } ${isEndedOrRejected ? 'opacity-40 cursor-not-allowed' : ''}`}
                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
              </button>

              <button
                onClick={onEndCall}
                className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition-transform active:scale-95 cursor-pointer"
                title="End call"
              >
                <PhoneOff size={24} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallModal;
