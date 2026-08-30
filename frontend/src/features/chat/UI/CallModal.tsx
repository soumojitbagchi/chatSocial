import React, { useState, useEffect, useRef } from 'react';
import {
  PhoneOff,
  Phone,
  Mic,
  MicOff,
  Video,
  VideoOff,
  ShieldCheck,
  Volume2,
} from 'lucide-react';

export interface CallModalProps {
  contactName: string;
  avatar?: string;
  type: 'audio' | 'video';
  status?: 'idle' | 'calling' | 'ringing' | 'connected' | 'ended' | 'rejected' | 'busy' | 'error';
  statusMessage?: string;
  direction?: 'incoming' | 'outgoing';
  isMuted?: boolean;
  isVideoOff?: boolean;
  localStream?: MediaStream | null;
  remoteStream?: MediaStream | null;
  onAcceptCall?: () => void;
  onRejectCall?: () => void;
  onEndCall: () => void;
  onToggleMute?: () => void;
  onToggleVideo?: () => void;
}

export const CallModal: React.FC<CallModalProps> = ({
  contactName,
  avatar,
  type = 'audio',
  status = 'calling',
  statusMessage,
  direction = 'outgoing',
  isMuted = false,
  isVideoOff = false,
  localStream = null,
  remoteStream = null,
  onAcceptCall,
  onRejectCall,
  onEndCall,
  onToggleMute,
  onToggleVideo,
}) => {
  const [callDuration, setCallDuration] = useState(0);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const isConnected = status === 'connected';
  const isIncomingRinging = direction === 'incoming' && status === 'ringing';
  const isOutgoingCalling = direction === 'outgoing' && (status === 'calling' || status === 'ringing');
  const isEndedOrRejected = status === 'ended' || status === 'rejected' || status === 'error';
  const isVideoCall = type === 'video';

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

  // Bind local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isConnected, isVideoCall]);

  // Bind remote video stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, isConnected, isVideoCall]);

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getSubStatusText = () => {
    if (statusMessage) return statusMessage;
    if (isConnected) return `${isVideoCall ? 'HD Video' : 'Opus HD Voice'} • ${formatDuration(callDuration)}`;
    if (isIncomingRinging) return `Incoming ${isVideoCall ? 'Video' : 'Voice'} Call...`;
    if (isOutgoingCalling) return 'Ringing...';
    if (status === 'rejected') return 'Call Declined';
    if (status === 'ended') return 'Call Ended';
    return `${isVideoCall ? 'Video' : 'Voice'} Call`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div
        className={`relative w-full ${isVideoCall && isConnected ? 'max-w-2xl min-h-[560px]' : 'max-w-md min-h-[460px]'
          } rounded-3xl bg-[#12151b] border border-[#262c38] overflow-hidden shadow-2xl flex flex-col items-center justify-between p-6 text-white transition-all duration-300`}
      >
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-slate-700/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="relative z-10 text-center space-y-1 w-full">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[11px] font-mono text-emerald-400">
            <ShieldCheck size={13} />
            <span>MEDIASOUP SFU ENCRYPTED</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight mt-2">{contactName || 'User'}</h2>
          <p className="text-xs font-mono text-white/80 font-medium">{getSubStatusText()}</p>
        </div>

        {/* Center Content: Video or Avatar */}
        {isVideoCall && isConnected ? (
          <div className="relative z-10 w-full flex-1 my-4 flex items-center justify-center rounded-2xl overflow-hidden bg-slate-950 border border-white/10 min-h-[300px]">
            {/* Remote Video Stream */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover rounded-2xl"
            />

            {/* Local Video Stream PIP */}
            <div className="absolute bottom-3 right-3 w-32 h-44 rounded-xl overflow-hidden shadow-2xl border-2 border-slate-600/50 bg-[#181c24] z-20">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : 'block'}`}
              />
              {isVideoOff && (
                <div className="w-full h-full flex items-center justify-center bg-[#181c24] text-slate-400 text-xs font-medium">
                  Camera Off
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="relative z-10 my-auto flex flex-col items-center">
            <div className="relative flex items-center justify-center">
              {(isOutgoingCalling || isIncomingRinging) && (
                <>
                  <div className="absolute w-36 h-36 rounded-full bg-slate-500/20 animate-ping" />
                  <div className="absolute w-44 h-44 rounded-full bg-slate-500/10 animate-pulse" />
                </>
              )}
              {isConnected && <div className="absolute w-36 h-36 rounded-full bg-emerald-500/20 animate-pulse" />}

              <div className="relative w-28 h-28 rounded-full overflow-hidden ring-4 ring-slate-700/60 shadow-2xl bg-[#181c24] flex items-center justify-center">
                {avatar ? (
                  <img src={avatar} alt={contactName || 'Caller'} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white font-bold text-3xl">
                    {contactName ? contactName.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
              </div>

              <span
                className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full ring-4 ring-[#12151b] flex items-center justify-center text-xs shadow-md ${isConnected
                    ? 'bg-emerald-500 text-white'
                    : isEndedOrRejected
                      ? 'bg-rose-500 text-white'
                      : 'bg-slate-700 text-white'
                  }`}
              >
                {isConnected ? <Volume2 size={13} /> : <Phone size={13} />}
              </span>
            </div>

            <div className="mt-4 px-3 py-1 rounded-full bg-[#181c24] border border-[#262c38] text-[11px] font-medium text-slate-300">
              {status === 'connected' ? (
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  SFU Media Active
                </span>
              ) : status === 'calling' ? (
                <span>Calling recipient...</span>
              ) : status === 'ringing' ? (
                <span className="text-slate-300">Ringing...</span>
              ) : (
                <span>{statusMessage || 'Connecting...'}</span>
              )}
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="relative z-10 flex items-center gap-4 mt-2">
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
                title={`Accept ${isVideoCall ? 'video' : 'voice'} call`}
              >
                {isVideoCall ? <Video size={28} /> : <Phone size={28} />}
              </button>
            </>
          ) : (
            <>
              {/* Mute Microphone Button */}
              <button
                onClick={onToggleMute}
                disabled={isEndedOrRejected}
                className={`w-13 h-13 rounded-full flex items-center justify-center transition-all cursor-pointer ${isMuted ? 'bg-rose-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
                  } ${isEndedOrRejected ? 'opacity-40 cursor-not-allowed' : ''}`}
                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
              </button>

              {/* Camera Video Toggle Button (for video calls) */}
              {isVideoCall && (
                <button
                  onClick={onToggleVideo}
                  disabled={isEndedOrRejected}
                  className={`w-13 h-13 rounded-full flex items-center justify-center transition-all cursor-pointer ${isVideoOff ? 'bg-rose-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
                    } ${isEndedOrRejected ? 'opacity-40 cursor-not-allowed' : ''}`}
                  title={isVideoOff ? 'Turn camera on' : 'Turn camera off'}
                >
                  {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
                </button>
              )}

              {/* End Call Button */}
              <button
                onClick={() => onEndCall()}
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
