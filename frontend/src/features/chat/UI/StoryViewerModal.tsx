import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Loader2,
  Check
} from 'lucide-react';
import { ApiUserStatusGroup, ApiStoryItem } from '../api/chatApi';

export interface StoryViewerModalProps {
  deck: ApiUserStatusGroup;
  activeSlideIndex: number;
  onClose: () => void;
  onNextSlide: () => void;
  onPrevSlide: () => void;
  onNextDeck?: () => void;
  onPrevDeck?: () => void;
  onDeleteStory?: (statusId: string) => Promise<void>;
  onReply?: (statusId: string, text: string) => Promise<void>;
  onSelectChat?: (roomId: string) => void;
}

const DURATION_PER_SLIDE = 5000;

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  deck,
  activeSlideIndex,
  onClose,
  onNextSlide,
  onPrevSlide,
  onNextDeck: _onNextDeck,
  onPrevDeck: _onPrevDeck,
  onDeleteStory,
  onReply,
}) => {
  const [progress, setProgress] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [replyText, setReplyText] = useState<string>('');
  const [isSendingReply, setIsSendingReply] = useState<boolean>(false);
  const [replySuccess, setReplySuccess] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [showViewersSheet, setShowViewersSheet] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const replyInputRef = useRef<HTMLInputElement>(null);
  const pressTimerRef = useRef<number | null>(null);

  const currentSlide: ApiStoryItem | undefined = deck.stories[activeSlideIndex];
  const isOwner = Boolean(deck.isMe);

  useEffect(() => {
    const timer = setTimeout(() => {
      setProgress(0);
      setReplySuccess(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [activeSlideIndex, deck.userId]);

  useEffect(() => {
    if (isPaused || isSendingReply || showViewersSheet) return;

    const intervalTime = 50;
    const step = (intervalTime / DURATION_PER_SLIDE) * 100;

    const timer = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          window.clearInterval(timer);
          onNextSlide();
          return 0;
        }
        return prev + step;
      });
    }, intervalTime);

    return () => window.clearInterval(timer);
  }, [isPaused, isSendingReply, showViewersSheet, onNextSlide, activeSlideIndex, deck.userId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement === replyInputRef.current) {
        if (e.key === 'Escape') {
          replyInputRef.current?.blur();
          setIsPaused(false);
        }
        return;
      }

      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        onNextSlide();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onPrevSlide();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNextSlide, onPrevSlide, onClose]);

  const handleSendReply = async (textToSend?: string) => {
    const message = textToSend || replyText;
    if (!message.trim() || !currentSlide || !onReply || isSendingReply) return;

    setIsSendingReply(true);
    try {
      await onReply(currentSlide.id, message.trim());
      setReplyText('');
      setReplySuccess(true);
      setTimeout(() => {
        setReplySuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to send story reply:', err);
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleDeleteCurrentSlide = async () => {
    if (!currentSlide || !onDeleteStory || isDeleting) return;
    if (!window.confirm('Delete this status update?')) return;

    setIsDeleting(true);
    try {
      await onDeleteStory(currentSlide.id);
    } catch (err) {
      console.error('Failed to delete story:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const QUICK_REACTIONS = ['😍', '😂', '🔥', '👏', '❤️', '😮', '🙌', '💯'];

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, input, textarea')) return;
    pressTimerRef.current = window.setTimeout(() => {
      setIsPaused(true);
    }, 150);
  };

  const handlePointerUp = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    setIsPaused(false);
  };

  const handleTapZone = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, input, textarea, .cs-story-interactive')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;

    if (clickX < width * 0.35) {
      onPrevSlide();
    } else {
      onNextSlide();
    }
  };

  if (!currentSlide) return null;

  return (
    <div
      className="cs-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`${deck.userName}'s status`}
    >
      <button
        onClick={onPrevSlide}
        className="hidden md:flex absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer z-50 shadow-xl border border-white/10"
        title="Previous Status (Left Arrow)"
        aria-label="Previous Status"
      >
        <ChevronLeft size={28} />
      </button>

      <button
        onClick={onNextSlide}
        className="hidden md:flex absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer z-50 shadow-xl border border-white/10"
        title="Next Status (Right Arrow)"
        aria-label="Next Status"
      >
        <ChevronRight size={28} />
      </button>

      <div
        className="relative w-full max-w-sm sm:max-w-md h-[88vh] max-h-[780px] rounded-3xl overflow-hidden bg-black border border-white/15 shadow-2xl flex flex-col justify-between select-none animate-in zoom-in-95 duration-150"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onClick={handleTapZone}
      >
        {currentSlide.mediaType === 'video' ? (
          <div className="absolute inset-0 w-full h-full bg-black flex items-center justify-center">
            <video
              ref={videoRef}
              src={currentSlide.mediaUrl}
              autoPlay
              playsInline
              loop
              muted={isMuted}
              className="w-full h-full object-contain"
            />
          </div>
        ) : currentSlide.mediaType === 'image' && currentSlide.mediaUrl ? (
          <div className="absolute inset-0 w-full h-full bg-black flex items-center justify-center">
            <img
              src={currentSlide.mediaUrl}
              alt={currentSlide.caption || deck.userName}
              className="w-full h-full object-contain sm:object-cover"
            />
          </div>
        ) : (
          <div
            className="absolute inset-0 w-full h-full flex items-center justify-center p-8 text-center"
            style={{
              background: currentSlide.backgroundColor?.includes('gradient')
                ? currentSlide.backgroundColor
                : currentSlide.backgroundColor || 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            }}
          >
            <p
              className="text-xl sm:text-2xl font-bold text-white leading-relaxed drop-shadow-md break-words"
              style={{ fontFamily: currentSlide.fontStyle || 'inherit' }}
            >
              {currentSlide.caption || 'No text'}
            </p>
          </div>
        )}

        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none z-10" />

        <div className="absolute bottom-0 inset-x-0 h-44 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none z-10" />

        <div className="relative z-20 p-4 space-y-3">
          <div className="flex items-center gap-1.5 w-full">
            {deck.stories.map((storyItem, idx) => {
              let fillPercent = 0;
              if (idx < activeSlideIndex) fillPercent = 100;
              else if (idx === activeSlideIndex) fillPercent = progress;

              return (
                <div
                  key={storyItem.id || idx}
                  className="flex-1 h-1 rounded-full bg-white/30 overflow-hidden backdrop-blur-xs"
                >
                  <div
                    className="h-full bg-white rounded-full transition-all duration-75 ease-linear"
                    style={{ width: `${fillPercent}%` }}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5">
              <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-white/80 shrink-0 bg-slate-800">
                <img
                  src={deck.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                  alt={deck.userName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white leading-tight truncate drop-shadow-sm">
                  {deck.userName}
                </h4>
                <p className="text-[11px] font-medium text-white/80 drop-shadow-xs">
                  {currentSlide.time} ({currentSlide.timeAgo})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 cs-story-interactive">
              {currentSlide.mediaType === 'video' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMuted((prev) => !prev);
                  }}
                  className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md cursor-pointer transition-colors"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                </button>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPaused((prev) => !prev);
                }}
                className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md cursor-pointer transition-colors"
                title={isPaused ? 'Resume' : 'Pause'}
              >
                {isPaused ? <Play size={14} className="ml-0.5" /> : <Pause size={14} />}
              </button>

              {isOwner && onDeleteStory && (
                <button
                  disabled={isDeleting}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCurrentSlide();
                  }}
                  className="w-8 h-8 rounded-full bg-rose-500/30 hover:bg-rose-500/50 text-rose-200 hover:text-white flex items-center justify-center backdrop-blur-md cursor-pointer transition-colors border border-rose-500/30"
                  title="Delete this status update"
                >
                  {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md cursor-pointer transition-colors"
                title="Close (Esc)"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>

        {currentSlide.mediaType !== 'text' && currentSlide.caption && (
          <div className="relative z-20 px-6 py-2 text-center pointer-events-none">
            <p className="inline-block max-w-full px-4 py-2 rounded-2xl bg-black/60 backdrop-blur-md text-white text-xs sm:text-sm font-medium leading-relaxed drop-shadow-md break-words pointer-events-auto">
              {currentSlide.caption}
            </p>
          </div>
        )}

        <div className="relative z-20 p-4 space-y-3 cs-story-interactive">
          {isOwner ? (
            <div className="flex flex-col items-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowViewersSheet((prev) => !prev);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md text-white text-xs font-semibold border border-white/20 cursor-pointer transition-all hover:scale-105"
              >
                <Eye size={14} className="text-emerald-400" />
                <span>{currentSlide.viewersCount || 0} views</span>
              </button>

              {showViewersSheet && (
                <div
                  className="w-full mt-3 p-3 rounded-2xl bg-slate-900/95 border border-white/15 backdrop-blur-xl max-h-40 overflow-y-auto text-left space-y-2 animate-in fade-in slide-in-from-bottom-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                    <span className="text-[11px] font-bold text-white/70 uppercase">Viewed By</span>
                    <button
                      onClick={() => setShowViewersSheet(false)}
                      className="text-white/60 hover:text-white p-0.5"
                    >
                      <X size={13} />
                    </button>
                  </div>
                  {currentSlide.viewers && currentSlide.viewers.length > 0 ? (
                    currentSlide.viewers.map((viewer) => (
                      <div key={viewer.id} className="flex items-center gap-2 py-1">
                        <img
                          src={viewer.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                          alt={viewer.name}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                        <span className="text-xs text-white font-medium truncate flex-1">{viewer.name}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-white/50 py-1">No views yet</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleSendReply(emoji)}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/30 backdrop-blur-md text-base flex items-center justify-center hover:scale-125 transition-transform active:scale-95 cursor-pointer shadow-sm"
                    title={`React with ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    ref={replyInputRef}
                    type="text"
                    placeholder={`Reply to ${deck.userName}...`}
                    value={replyText}
                    onFocus={() => setIsPaused(true)}
                    onBlur={() => {
                      if (!replyText) setIsPaused(false);
                    }}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                    className="w-full h-11 pl-4 pr-10 rounded-full bg-black/50 border border-white/30 text-xs text-white placeholder:text-white/60 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all shadow-lg"
                  />
                  {replySuccess && (
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-400 flex items-center gap-1 text-[11px] font-bold animate-in fade-in">
                      <Check size={14} />
                      <span>Sent</span>
                    </span>
                  )}
                </div>

                <button
                  disabled={!replyText.trim() || isSendingReply}
                  onClick={() => handleSendReply()}
                  className="w-11 h-11 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 flex items-center justify-center shadow-lg transition-transform active:scale-95 disabled:pointer-events-none cursor-pointer shrink-0 font-bold"
                  title="Send Reply"
                  aria-label="Send Reply"
                >
                  {isSendingReply ? (
                    <Loader2 size={16} className="animate-spin text-slate-950" />
                  ) : (
                    <Send size={16} strokeWidth={2.5} />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoryViewerModal;
