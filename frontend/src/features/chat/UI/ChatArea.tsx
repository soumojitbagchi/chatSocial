import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Phone, 
  Video, 
  Info, 
  MoreVertical, 
  Paperclip, 
  Smile, 
  Mic, 
  Send, 
  CheckCheck, 
  FileText, 
  Download, 
  Play, 
  Pause, 
  Volume2, 
  Image as ImageIcon, 
  User, 
  ArrowLeft,
  BarChart2,
  MessageSquare
} from 'lucide-react';
import { ChatItem } from './ChatList';
import '../style/components.css';

export interface Reaction {
  emoji: string;
  count: number;
  reacted?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'me' | 'other' | 'system';
  senderName?: string;
  avatar?: string;
  type?: 'text' | 'audio' | 'document' | 'photo' | 'gallery' | 'date' | 'call-log';
  text?: string;
  audioDuration?: string;
  audioUrl?: string;
  fileName?: string;
  fileSize?: string;
  fileType?: string;
  imageUrl?: string;
  photoUrl?: string;
  caption?: string;
  time: string;
  status?: 'sent' | 'delivered' | 'read';
  reactions?: Reaction[];
  callType?: string;
  duration?: string;
}

export interface ChatAreaProps {
  activeChat: ChatItem | null;
  messages: ChatMessage[];
  onSendMessage: (text: string, type?: string, meta?: Record<string, unknown>) => void;
  onBack?: () => void;
  currentUser?: {
    id: string;
    name: string;
    avatar: string;
  };
  onStartCall?: (type: 'audio' | 'video') => void;
  onOpenDetails?: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  activeChat,
  messages = [],
  onSendMessage,
  onBack,
  currentUser = {
    id: 'user-me',
    name: 'You',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  },
  onStartCall,
  onOpenDetails
}) => {
  const [inputText, setInputText] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<number>(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const attachRef = useRef<HTMLDivElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChat]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (attachRef.current && !attachRef.current.contains(e.target as Node)) {
        setShowAttachMenu(false);
      }
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isRecording) return;
    const timer = window.setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, [isRecording]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim(), 'text');
    setInputText('');
    setShowEmojiPicker(false);
    setShowAttachMenu(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const togglePlayAudio = (msgId: string) => {
    if (playingAudioId === msgId) {
      setPlayingAudioId(null);
    } else {
      setPlayingAudioId(msgId);
      setAudioProgress(0);
      const interval = setInterval(() => {
        setAudioProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setPlayingAudioId(null);
            return 0;
          }
          return prev + 10;
        });
      }, 300);
    }
  };

  const addReaction = (msgId: string, emoji: string) => {
    console.log(`Reacted ${emoji} to msg ${msgId}`);
  };

  const sendAttachmentSimulation = (type: string) => {
    setShowAttachMenu(false);
    if (type === 'document') {
      onSendMessage('Shared document: Proposal_Q4_Final.pdf', 'document', {
        fileName: 'Proposal_Q4_Final.pdf',
        fileSize: '2.4 MB'
      });
    } else if (type === 'photo') {
      onSendMessage('Shared image', 'photo', {
        imageUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80',
        caption: 'Latest project prototype design 🚀'
      });
    } else if (type === 'audio') {
      onSendMessage('Voice memo (0:34)', 'audio', {
        audioDuration: '0.34'
      });
    }
  };

  if (!activeChat) {
    return (
      <main className="cs-conversation-empty">
        <div className="text-center p-8 max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 mx-auto flex items-center justify-center mb-4 shadow-sm">
            <Smile size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
            Select a conversation
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Choose a contact from the list or start a new chat to connect seamlessly with real-time zero-knowledge encryption.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="cs-conversation" aria-label={`Conversation with ${activeChat.name}`}>
      <header className="cs-chat-header">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button 
              onClick={onBack}
              className="md:hidden p-1.5 -ml-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
              title="Back"
            >
              <ArrowLeft size={20} />
            </button>
          )}

          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 shadow-sm">
              {activeChat.avatar ? (
                <img 
                  src={activeChat.avatar} 
                  alt={activeChat.name} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div 
                  className="w-full h-full flex items-center justify-center font-bold text-white text-sm"
                  style={{ backgroundColor: activeChat.avatarBg || '#7c3aed' }}
                >
                  {activeChat.initials || activeChat.name.charAt(0)}
                </div>
              )}
            </div>
            {activeChat.online && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
            )}
          </div>

          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
              <span>{activeChat.name}</span>
            </h3>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <span>Online</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
          <button 
            className="cs-header-btn" 
            title="Search in conversation"
          >
            <Search size={18} />
          </button>

          <button 
            className="cs-header-btn" 
            onClick={() => onStartCall && onStartCall('audio')}
            title="Voice call"
          >
            <Phone size={18} />
          </button>

          <button 
            className="cs-header-btn" 
            onClick={() => onStartCall && onStartCall('video')}
            title="Video call"
          >
            <Video size={18} />
          </button>

          <button 
            className="cs-header-btn" 
            onClick={onOpenDetails}
            title="Contact Info"
          >
            <Info size={18} />
          </button>

          <button 
            className="cs-header-btn" 
            title="More options"
          >
            <MoreVertical size={18} />
          </button>
        </div>
      </header>

      <div className="cs-messages-container">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 my-auto text-slate-400 select-none">
            <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-3 shadow-sm">
              <MessageSquare size={22} />
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-white">No messages in this room yet</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">Type a message below and hit send to start the conversation on the server!</p>
          </div>
        )}
        {messages.map((msg) => {
          if (msg.type === 'date') {
            return (
              <div key={msg.id} className="cs-date-pill-wrap">
                <span className="cs-date-pill">
                  {msg.text}
                </span>
              </div>
            );
          }

          const isMe = msg.sender === 'me';
          const senderAvatar = isMe 
            ? (currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80')
            : (activeChat.avatar || msg.avatar);

          return (
            <div 
              key={msg.id} 
              className={`cs-msg-row ${isMe ? 'sent' : 'received'} group`}
            >
              {!isMe && (
                <div className="cs-msg-avatar-wrap">
                  <img 
                    src={senderAvatar} 
                    alt={msg.senderName || activeChat.name} 
                    className="w-8 h-8 rounded-full object-cover shadow-sm" 
                  />
                </div>
              )}

              <div className={`cs-msg-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`cs-msg-meta-header ${isMe ? 'justify-end' : 'justify-start'}`}>
                  {isMe ? (
                    <>
                      <CheckCheck size={13} className="text-emerald-500 inline-block" />
                      <span className="cs-meta-time">{msg.time}</span>
                      <span className="cs-meta-name font-semibold text-slate-700 dark:text-slate-300">You</span>
                    </>
                  ) : (
                    <>
                      <span className="cs-meta-name font-semibold text-slate-800 dark:text-slate-200">
                        {msg.senderName || activeChat.name}
                      </span>
                      <span className="cs-meta-dot">•</span>
                      <span className="cs-meta-time">{msg.time}</span>
                      <CheckCheck size={13} className="text-emerald-500 inline-block" />
                    </>
                  )}
                </div>

                <div className={`cs-msg-bubble-wrap ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`cs-msg-bubble ${isMe ? 'bubble-sent' : 'bubble-received'}`}>
                    {msg.type === 'audio' ? (
                      <div className="cs-audio-card">
                        <button
                          type="button"
                          onClick={() => togglePlayAudio(msg.id)}
                          className="cs-audio-play-btn"
                          title={playingAudioId === msg.id ? 'Pause' : 'Play'}
                        >
                          {playingAudioId === msg.id ? (
                            <Pause size={14} fill="currentColor" />
                          ) : (
                            <Play size={14} fill="currentColor" className="ml-0.5" />
                          )}
                        </button>

                        <div className="cs-audio-waveform-track">
                          <div 
                            className="cs-audio-waveform-fill"
                            style={{ width: playingAudioId === msg.id ? `${audioProgress}%` : '0%' }}
                          />
                        </div>

                        <span className="cs-audio-duration">
                          {playingAudioId === msg.id ? `0:${Math.floor((audioProgress / 100) * 34).toString().padStart(2, '0')}` : '0.00'}
                        </span>

                        <Volume2 size={15} className="cs-audio-speaker-icon" />
                      </div>
                    ) : msg.type === 'document' ? (
                      <div className="cs-doc-card">
                        <div className="cs-doc-badge">
                          <FileText size={18} className="text-violet-600" />
                        </div>
                        <div className="flex flex-col min-w-0 pr-2">
                          <span className="text-xs font-bold text-white truncate">
                            {msg.fileName || 'Document.pdf'}
                          </span>
                          <span className="text-[10px] text-white/80 font-medium">
                            {msg.fileSize || '14.23 KB'}
                          </span>
                        </div>
                        <button 
                          className="cs-doc-download-btn"
                          title="Download attachment"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    ) : msg.type === 'photo' ? (
                      <div className="cs-photo-card">
                        <img 
                          src={msg.imageUrl || msg.photoUrl} 
                          alt={msg.caption || 'Photo'} 
                          className="rounded-xl max-h-60 w-full object-cover"
                        />
                        {msg.caption && (
                          <p className="mt-1.5 text-xs text-slate-800 dark:text-slate-100">{msg.caption}</p>
                        )}
                      </div>
                    ) : (
                      /* Standard Text Message */
                      <p className="text-[13.5px] leading-relaxed select-text">
                        {msg.text}
                      </p>
                    )}
                  </div>

                  {/* 3-dots Hover Actions Menu for Bubble */}
                  <button 
                    className="cs-msg-hover-action"
                    title="Message options"
                  >
                    <MoreVertical size={13} />
                  </button>
                </div>

                {/* Emoji Reactions Bar underneath bubble if present */}
                {msg.reactions && msg.reactions.length > 0 && (
                  <div className={`cs-reactions-row ${isMe ? 'justify-end' : 'justify-start'}`}>
                    {msg.reactions.map((react, idx) => (
                      <button
                        key={idx}
                        onClick={() => addReaction(msg.id, react.emoji)}
                        className="cs-reaction-pill"
                        title={`Reaction: ${react.emoji}`}
                      >
                        <span>{react.emoji}</span>
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                          {react.count}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Me Avatar on Right for Sent Messages */}
              {isMe && (
                <div className="cs-msg-avatar-wrap">
                  <img 
                    src={senderAvatar} 
                    alt="You" 
                    className="w-8 h-8 rounded-full object-cover shadow-sm" 
                  />
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Popovers: Attachment & Emoji Picker */}
      {showAttachMenu && (
        <div className="cs-attach-menu" ref={attachRef}>
          <button 
            type="button" 
            className="cs-attach-option"
            onClick={() => sendAttachmentSimulation('document')}
          >
            <div className="cs-attach-icon bg-violet-500 text-white">
              <FileText size={16} />
            </div>
            <span>Document</span>
          </button>
          <button 
            type="button" 
            className="cs-attach-option"
            onClick={() => sendAttachmentSimulation('photo')}
          >
            <div className="cs-attach-icon bg-blue-500 text-white">
              <ImageIcon size={16} />
            </div>
            <span>Photos & Videos</span>
          </button>
          <button 
            type="button" 
            className="cs-attach-option"
            onClick={() => sendAttachmentSimulation('audio')}
          >
            <div className="cs-attach-icon bg-amber-500 text-white">
              <Mic size={16} />
            </div>
            <span>Audio Memo</span>
          </button>
          <button 
            type="button" 
            className="cs-attach-option"
            onClick={() => setShowAttachMenu(false)}
          >
            <div className="cs-attach-icon bg-emerald-500 text-white">
              <User size={16} />
            </div>
            <span>Contact Card</span>
          </button>
          <button 
            type="button" 
            className="cs-attach-option"
            onClick={() => setShowAttachMenu(false)}
          >
            <div className="cs-attach-icon bg-rose-500 text-white">
              <BarChart2 size={16} />
            </div>
            <span>Create Poll</span>
          </button>
        </div>
      )}

      {showEmojiPicker && (
        <div className="cs-emoji-popover" ref={emojiRef}>
          <div className="flex items-center gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Quick Reactions</span>
          </div>
          <div className="grid grid-cols-7 gap-2 p-3 text-lg">
            {['😀', '😂', '😍', '❤️', '👍', '🔥', '🎉', '👏', '🚀', '💯', '✨', '🙏', '😎', '🙌'].map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="hover:scale-125 transition-transform p-1 cursor-pointer flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => {
                  setInputText((prev) => prev + emoji);
                  setShowEmojiPicker(false);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      <footer className="cs-composer-container">
        <form onSubmit={handleSend} className="cs-composer-bar">
          <button
            type="button"
            onClick={() => setShowAttachMenu((prev) => !prev)}
            className={`cs-composer-icon-btn ${showAttachMenu ? 'active' : ''}`}
            title="Attach file or media"
            aria-label="Attach file"
          >
            <Paperclip size={19} />
          </button>

          <button
            type="button"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            className={`cs-composer-icon-btn ${showEmojiPicker ? 'active' : ''}`}
            title="Add emoji"
            aria-label="Add emoji"
          >
            <Smile size={19} />
          </button>

          {/* Main Input Field */}
          <div className="cs-composer-input-wrap">
            <input
              ref={inputRef}
              type="text"
              className="cs-composer-input"
              placeholder="Type a message..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              aria-label="Message input"
            />
          </div>

          {/* Send / Voice Note Button */}
          {inputText.trim() ? (
            <button
              type="submit"
              className="cs-send-btn"
              title="Send Message"
              aria-label="Send Message"
            >
              <Send size={16} strokeWidth={2.5} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (isRecording) {
                  setIsRecording(false);
                  onSendMessage(`🎙️ Voice note (${recordingSeconds}s)`, 'audio', {
                    audioDuration: `0:${recordingSeconds.toString().padStart(2, '0')}`
                  });
                } else {
                  setRecordingSeconds(0);
                  setIsRecording(true);
                }
              }}
              className={`cs-composer-icon-btn ${isRecording ? 'text-rose-500 animate-pulse' : ''}`}
              title={isRecording ? 'Click to finish and send voice note' : 'Record voice note'}
              aria-label="Voice note"
            >
              <Mic size={19} />
            </button>
          )}
        </form>

        {isRecording && (
          <div className="flex items-center justify-between px-4 py-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-mono rounded-lg mt-1.5 border border-rose-200 dark:border-rose-900/50">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span>Recording audio: 0:{recordingSeconds.toString().padStart(2, '0')}</span>
            </span>
            <button
              type="button"
              onClick={() => setIsRecording(false)}
              className="text-slate-500 hover:text-slate-800 text-[11px] underline cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}
      </footer>
    </main>
  );
};

export default ChatArea;
