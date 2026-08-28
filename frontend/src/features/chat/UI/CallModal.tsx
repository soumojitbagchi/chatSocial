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
    <div className="cs-modal-backdrop" role="dialog" aria-modal="true" aria-label={`${type} call with ${contactName}`}>
      <div className="cs-call-panel">
        <div className="cs-call-header">
          <div className="cs-call-state">
            <ShieldCheck size={13} />
            <span>Encrypted call</span>
          </div>
          <h2>{contactName}</h2>
          <p className="tabular-nums">
            {type === 'video' ? 'Video call' : 'Voice call'} · {formatDuration(callDuration)}
          </p>
        </div>

        <div className="cs-call-media">
          {type === 'video' && !isVideoOff ? (
            <div className="cs-call-video">
              <img
                src={avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&auto=format&fit=crop&q=80'}
                alt={contactName}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="cs-call-avatar">
              <div>
                {avatar ? (
                  <img src={avatar} alt={contactName} className="w-full h-full object-cover" />
                ) : (
                  <div className="cs-call-avatar-fallback">
                    {contactName.charAt(0)}
                  </div>
                )}
              </div>
              <span />
            </div>
          )}
        </div>

        <div className="cs-call-controls">
          <button
            onClick={() => setIsMuted((prev) => !prev)}
            className={`cs-call-control ${isMuted ? 'active' : ''}`}
            title={isMuted ? 'Unmute' : 'Mute'}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          <button
            onClick={() => setIsVideoOff((prev) => !prev)}
            className={`cs-call-control ${isVideoOff ? 'active' : ''}`}
            title={isVideoOff ? 'Turn on video' : 'Turn off video'}
            aria-label={isVideoOff ? 'Turn on video' : 'Turn off video'}
          >
            {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
          </button>

          <button
            onClick={onEndCall}
            className="cs-call-control cs-call-end"
            title="End call"
            aria-label="End call"
          >
            <PhoneOff size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallModal;
