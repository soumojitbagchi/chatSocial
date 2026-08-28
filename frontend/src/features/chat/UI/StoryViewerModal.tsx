import React, { useState, useEffect } from 'react';
import { X, Send } from 'lucide-react';
import { StatusItem } from './StatusSection';

export interface StoryViewerModalProps {
  story: StatusItem;
  onClose: () => void;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  story,
  onClose
}) => {
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    const interval = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          window.clearInterval(interval);
          onClose();
          return 100;
        }
        return prev + 2;
      });
    }, 100);

    return () => window.clearInterval(interval);
  }, [onClose]);

  return (
    <div className="cs-modal-backdrop" role="dialog" aria-modal="true" aria-label={`${story.userName}'s status`}>
      <div className="relative w-full max-w-sm h-[600px] rounded-3xl overflow-hidden bg-slate-900 border border-white/10 shadow-2xl flex flex-col justify-between p-4">
        <img
          src={story.storyImage || story.avatar}
          alt={story.userName}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/35" />

        <div className="relative z-10 space-y-3">
          <div className="w-full h-1 rounded-full bg-white/30 overflow-hidden">
            <div 
              className="h-full bg-white rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src={story.avatar}
                alt={story.userName}
                className="w-9 h-9 rounded-full object-cover border-2 border-white"
              />
              <div>
                <h4 className="text-xs font-bold text-white leading-tight">{story.userName}</h4>
                <p className="text-[10px] text-white/70">{story.time}</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 cursor-pointer"
              aria-label="Close status"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="relative z-10 space-y-3">
          {story.caption && (
            <p className="text-sm font-medium text-white text-center bg-black/50 p-2.5 rounded-xl">
              {story.caption}
            </p>
          )}

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder={`Reply to ${story.userName}...`}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="flex-1 h-10 px-4 rounded-full bg-black/40 border border-white/30 text-xs text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/40"
            />
            <button
              onClick={() => {
                if (replyText.trim()) {
                  onClose();
                }
              }}
              className="w-10 h-10 rounded-full bg-orange-600 hover:bg-orange-500 text-white flex items-center justify-center shadow-md cursor-pointer"
              aria-label="Send reply"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryViewerModal;
