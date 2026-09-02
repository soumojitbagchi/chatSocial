import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
  MessageSquare,
  Trash2,
  Pin,
  Star,
  Copy,
  Check,
  History,
  Loader2,
  X
} from 'lucide-react';
import type { ChatItem } from './ChatList';
import { chatApi } from '../api/chatApi';
import AttachmentPreviewDialog, {
  PendingAttachment,
  PendingAttachmentKind,
} from './AttachmentPreviewDialog';
import '../style/components.css';

export interface Reaction {
  emoji: string;
  count: number;
  reacted?: boolean;
}

export interface StoryReplyMeta {
  statusId?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'text';
  caption?: string;
  backgroundColor?: string;
  storyOwnerName?: string;
  storyOwnerId?: string;
  time?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'me' | 'other' | 'system';
  senderName?: string;
  avatar?: string;
  type?: 'text' | 'audio' | 'document' | 'photo' | 'video' | 'gallery' | 'date' | 'call-log' | 'story-reply';
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
  meta?: {
    storyReply?: StoryReplyMeta;
    [key: string]: unknown;
  };
  storyReply?: StoryReplyMeta;
}

export interface ChatAreaProps {
  activeChat: ChatItem | null;
  messages: ChatMessage[];
  onSendMessage: (text: string, type?: string, meta?: Record<string, unknown>) => void | Promise<void>;
  onBack?: () => void;
  currentUser?: {
    id: string;
    name: string;
    avatar: string;
  };
  onStartCall?: (type: 'audio' | 'video') => void;
  onOpenDetails?: () => void;
  onNewChat?: () => void;
  isOnline?: boolean;
  onDeleteMessage?: (msgId: string) => void;
  onDeleteChat?: (chatId: string) => void;
  onLoadMoreMessages?: () => void;
  hasMoreMessages?: boolean;
  isLoadingMore?: boolean;
}
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const ALLOWED_DOCUMENT_EXTENSIONS = new Set([
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip', 'tar', 'gz', 'json',
]);

const getFileExtension = (fileName: string) => fileName.split('.').pop()?.toLowerCase() || '';

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
  onOpenDetails,
  onNewChat,
  isOnline = false,
  onDeleteMessage,
  onDeleteChat,
  onLoadMoreMessages,
  hasMoreMessages = false,
  isLoadingMore = false,
}) => {
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [activeMenuMsgId, setActiveMenuMsgId] = useState<string | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [pinnedMsgIds, setPinnedMsgIds] = useState<Set<string>>(new Set());
  const [starredMsgIds, setStarredMsgIds] = useState<Set<string>>(new Set());
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [audioProgress, setAudioProgress] = useState<number>(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isSendingAttachment, setIsSendingAttachment] = useState(false);
  const [isSendingText, setIsSendingText] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const attachRef = useRef<HTMLDivElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const attachmentButtonRef = useRef<HTMLButtonElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const isSendingAttachmentRef = useRef(false);
  const hasPendingAttachmentRef = useRef(false);
  const isSendingTextRef = useRef(false);
  const activeChatIdRef = useRef<string | undefined>(activeChat?.id);

  const revokePreviewUrl = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  const clearPendingAttachment = useCallback(() => {
    revokePreviewUrl();
    setPendingAttachment(null);
    setUploadError(null);
    setIsSendingAttachment(false);
    isSendingAttachmentRef.current = false;
    hasPendingAttachmentRef.current = false;
    window.requestAnimationFrame(() => {
      const returnTarget = attachmentButtonRef.current || inputRef.current;
      returnTarget?.focus();
    });
  }, [revokePreviewUrl]);

  useEffect(() => {
    const nextChatId = activeChat?.id;
    const previousChatId = activeChatIdRef.current;
    activeChatIdRef.current = nextChatId;
    if (previousChatId === nextChatId || !hasPendingAttachmentRef.current) return;

    const clearTimer = window.setTimeout(clearPendingAttachment, 0);
    return () => window.clearTimeout(clearTimer);
  }, [activeChat?.id, clearPendingAttachment]);

  useEffect(() => () => {
    revokePreviewUrl();
  }, [revokePreviewUrl]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChat]);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest?.('.cs-msg-hover-action') || target.closest?.('.cs-msg-menu-popover')) {
        return;
      }
      if (attachRef.current && !attachRef.current.contains(e.target as Node)) {
        setShowAttachMenu(false);
      }
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
      setActiveMenuMsgId(null);
      setShowHeaderMenu(false);
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

  const handleSend = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const messageText = inputText.trim();
    if (!messageText || isSendingTextRef.current) return;

    isSendingTextRef.current = true;
    setIsSendingText(true);
    setUploadError(null);
    try {
      await onSendMessage(messageText, 'text');
      setInputText((current) => current.trim() === messageText ? '' : current);
      setShowEmojiPicker(false);
      setShowAttachMenu(false);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to send message.');
    } finally {
      isSendingTextRef.current = false;
      setIsSendingText(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
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

  const renderedMessages = useMemo(() => {
    const seen = new Set<string>();
    return messages.filter((m) => {
      const key = m.id || `${m.sender}-${m.time}-${m.text}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [messages]);

  const validateAttachment = useCallback((file: File, kind: PendingAttachmentKind) => {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      return 'Attachments must be 25 MB or smaller.';
    }

    if (kind === 'media') {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        return 'Choose a supported image or video file.';
      }
      return null;
    }

    if (!ALLOWED_DOCUMENT_EXTENSIONS.has(getFileExtension(file.name))) {
      return 'Choose a PDF, Office document, text, JSON, ZIP, TAR, or GZ file.';
    }

    return null;
  }, []);

  const stageAttachment = useCallback((file: File, kind: PendingAttachmentKind) => {
    const validationError = validateAttachment(file, kind);
    setShowAttachMenu(false);

    if (validationError) {
      setUploadError(validationError);
      return;
    }

    revokePreviewUrl();
    const messageType: PendingAttachment['messageType'] = kind === 'document'
      ? 'document'
      : file.type.startsWith('video/')
        ? 'video'
        : 'photo';
    const previewUrl = kind === 'media' ? URL.createObjectURL(file) : null;
    previewUrlRef.current = previewUrl;

    setUploadError(null);
    hasPendingAttachmentRef.current = true;
    setPendingAttachment({ file, kind, messageType, previewUrl });
  }, [revokePreviewUrl, validateAttachment]);

  const handleFileSelection = useCallback((event: React.ChangeEvent<HTMLInputElement>, kind: PendingAttachmentKind) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) stageAttachment(file, kind);
  }, [stageAttachment]);

  const handleReplaceAttachment = useCallback(() => {
    if (!pendingAttachment || isSendingAttachmentRef.current) return;
    setUploadError(null);
    if (pendingAttachment.kind === 'media') mediaInputRef.current?.click();
    else docInputRef.current?.click();
  }, [pendingAttachment]);

  const handleSendAttachment = useCallback(async () => {
    if (!pendingAttachment || isSendingAttachmentRef.current) return;

    const attachment = pendingAttachment;
    const destinationId = activeChat?.id;
    const userCaption = inputText.trim();
    isSendingAttachmentRef.current = true;
    setIsSendingAttachment(true);
    setUploadError(null);

    try {
      const uploaded = await chatApi.uploadAttachment(attachment.file);
      const isDocument = attachment.messageType === 'document';
      const fallbackText = attachment.messageType === 'video' ? 'Video' : 'Photo';
      const messageText = isDocument
        ? (uploaded.fileName || attachment.file.name || 'Document')
        : (userCaption || fallbackText);

      await onSendMessage(messageText, attachment.messageType, {
        url: uploaded.url,
        imageUrl: uploaded.url,
        photoUrl: uploaded.url,
        mediaUrl: uploaded.url,
        audioUrl: isDocument ? uploaded.url : undefined,
        fileName: uploaded.fileName || attachment.file.name,
        fileSize: uploaded.fileSize,
        fileType: uploaded.fileType || attachment.file.type,
        caption: userCaption || undefined,
      });

      if (activeChatIdRef.current === destinationId) {
        clearPendingAttachment();
        setInputText('');
      }
    } catch (err) {
      if (activeChatIdRef.current === destinationId) {
        setUploadError(err instanceof Error ? err.message : 'Failed to send attachment.');
      }
    } finally {
      isSendingAttachmentRef.current = false;
      if (activeChatIdRef.current === destinationId) {
        setIsSendingAttachment(false);
      }
    }
  }, [activeChat?.id, clearPendingAttachment, inputText, onSendMessage, pendingAttachment]);

  if (!activeChat) {
    return (
      <main className="cs-conversation-empty">
        <div className="text-center p-8 max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 mx-auto flex items-center justify-center mb-4 shadow-sm">
            <Smile size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
            Select a conversation
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
            Choose a contact from the list or start a new chat to connect seamlessly with real-time zero-knowledge encryption.
          </p>
          {onNewChat && (
            <button
              onClick={onNewChat}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-semibold shadow-sm transition-transform active:scale-95 cursor-pointer"
            >
              <User size={15} />
              <span>Start New Conversation</span>
            </button>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="cs-conversation" aria-label={`Conversation with ${activeChat.name}`}>
      <header className="cs-chat-header">
        <div className="flex ml-4 items-center gap-3 min-w-0 cursor-pointer hover:opacity-90 transition-opacity" onClick={onOpenDetails} title="Click to view contact info">
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden p-1.5 -ml-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer"
              title="Back"
              aria-label="Back to conversations"
            >
              <ArrowLeft size={20} />
            </button>
          )}

          <div className="relative shrink-0 w-11 h-11 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 shadow-xs ring-1 ring-black/5 dark:ring-white/10">
            {activeChat.avatar ? (
              <img
                src={activeChat.avatar}
                alt={activeChat.name || 'Avatar'}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center font-bold text-white text-sm rounded-full"
                style={{ backgroundColor: activeChat.avatarBg || '#475569' }}
              >
                {activeChat.initials || (activeChat.name ? activeChat.name.charAt(0).toUpperCase() : 'C')}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
              <span>{activeChat.name}</span>
            </h3>
            <p className={`text-xs font-medium flex items-center gap-1.5 ${isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              <span>{activeChat.isGroup ? (activeChat.groupMembers || 'Group conversation') : isOnline ? 'Online' : 'Offline'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
          <button
            className="cs-header-btn"
            title="Search in conversation"
            aria-label="Search in conversation"
          >
            <Search size={18} />
          </button>

          <button
            className="cs-header-btn"
            onClick={() => onStartCall && onStartCall('audio')}
            title="Voice call"
            aria-label="Start voice call"
          >
            <Phone size={18} />
          </button>

          <button
            className="cs-header-btn"
            onClick={() => onStartCall && onStartCall('video')}
            title="Video call"
            aria-label="Start video call"
          >
            <Video size={18} />
          </button>

          <button
            className="cs-header-btn"
            onClick={onOpenDetails}
            title="Contact Info"
            aria-label="Open contact details"
          >
            <Info size={18} />
          </button>

          <div className="relative">
            <button
              className={`cs-header-btn ${showHeaderMenu ? 'active' : ''}`}
              title="More options"
              aria-label="Conversation options"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowHeaderMenu((prev) => !prev);
              }}
            >
              <MoreVertical size={18} />
            </button>

            {showHeaderMenu && (
              <div
                className="absolute right-0 top-full mt-2 w-48 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-slate-700 dark:text-slate-200 text-xs font-medium"
                onClick={(e) => e.stopPropagation()}
              >
                {onOpenDetails && (
                  <button
                    type="button"
                    className="w-full px-3.5 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer"
                    onClick={() => {
                      setShowHeaderMenu(false);
                      onOpenDetails();
                    }}
                  >
                    <Info size={14} className="text-slate-400" />
                    <span>Conversation Info</span>
                  </button>
                )}
                {onDeleteChat && activeChat && (
                  <button
                    type="button"
                    className="w-full px-3.5 py-2 text-left hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2.5 cursor-pointer border-t border-slate-100 dark:border-slate-800/80 mt-1 pt-1.5"
                    onClick={() => {
                      setShowHeaderMenu(false);
                      onDeleteChat(activeChat.id);
                    }}
                  >
                    <Trash2 size={14} />
                    <span>Delete Conversation</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="cs-messages-container">
        {hasMoreMessages && (
          <div className="flex justify-center my-2 sticky top-1 z-20">
            <button
              type="button"
              onClick={onLoadMoreMessages}
              disabled={isLoadingMore}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-md border border-slate-200 dark:border-slate-700 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Load older messages"
            >
              <History size={13} className={isLoadingMore ? 'animate-spin' : 'text-slate-400'} />
              <span>{isLoadingMore ? 'Loading older messages...' : 'Load older messages'}</span>
            </button>
          </div>
        )}
        {renderedMessages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 my-auto text-slate-400 select-none">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center mb-3 shadow-sm">
              <MessageSquare size={22} />
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-white">No messages in this room yet</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">Type a message below and hit send to start the conversation on the server!</p>
          </div>
        )}
        {renderedMessages.map((msg) => {
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
                    className="w-9 h-9 rounded-full object-cover shadow-xs ring-1 ring-black/5 dark:ring-white/10"
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
                    {(msg.type === 'story-reply' || msg.meta?.storyReply || msg.storyReply) && (
                      (() => {
                        const storyQuote = (msg.meta?.storyReply || msg.storyReply) as StoryReplyMeta | undefined;
                        return (
                          <div className={`cs-story-quote-card mb-2 rounded-xl p-2.5 flex items-center justify-between gap-2.5 border-l-4 ${isMe
                            ? 'bg-black/25 border-emerald-400 text-white'
                            : 'bg-slate-100 dark:bg-[#181c24] border-emerald-500 text-slate-800 dark:text-slate-200'
                            }`}>
                            <div className="flex-1 min-w-0 pr-1">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 block truncate">
                                ⚡ Status • {storyQuote?.storyOwnerName || 'Contact'}
                              </span>
                              <p className={`text-xs truncate font-medium mt-0.5 ${isMe ? 'text-white/80' : 'text-slate-600 dark:text-slate-400'
                                }`}>
                                {storyQuote?.caption || (storyQuote?.mediaType === 'video' ? '📹 Video status' : storyQuote?.mediaType === 'image' ? '📷 Photo status' : 'Text status')}
                              </p>
                            </div>
                            {storyQuote?.mediaUrl ? (
                              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-black/40 border border-white/20">
                                {storyQuote.mediaType === 'video' ? (
                                  <video src={storyQuote.mediaUrl} className="w-full h-full object-cover" />
                                ) : (
                                  <img src={storyQuote.mediaUrl} alt="Status preview" className="w-full h-full object-cover" />
                                )}
                              </div>
                            ) : storyQuote?.backgroundColor ? (
                              <div
                                className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center p-1 text-[8px] font-bold text-white text-center leading-none overflow-hidden"
                                style={{ background: storyQuote.backgroundColor }}
                              >
                                {storyQuote.caption?.slice(0, 10) || 'Text'}
                              </div>
                            ) : null}
                          </div>
                        );
                      })()
                    )}

                    {msg.type === 'audio' ? (
                      <div className="cs-audio-card">
                        <button
                          type="button"
                          onClick={() => togglePlayAudio(msg.id)}
                          className="cs-audio-play-btn"
                          title={playingAudioId === msg.id ? 'Pause' : 'Play'}
                          aria-label={playingAudioId === msg.id ? 'Pause voice note' : 'Play voice note'}
                        >
                          {playingAudioId === msg.id ? (
                            <Pause size={14} fill="currentColor" />
                          ) : (
                            <Play size={14} fill="currentColor" className="ml-0.5" />
                          )}
                        </button>

                        <div className={`cs-audio-waveform-track ${isMe ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'}`}>
                          <div
                            className="cs-audio-waveform-fill"
                            style={{ width: playingAudioId === msg.id ? `${audioProgress}%` : '0%' }}
                          />
                        </div>

                        <span className={`cs-audio-duration ${isMe ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                          {playingAudioId === msg.id ? `0:${Math.floor((audioProgress / 100) * 34).toString().padStart(2, '0')}` : '0.00'}
                        </span>

                        <Volume2 size={15} className="cs-audio-speaker-icon" />
                      </div>
                    ) : msg.type === 'document' ? (
                      <div>
                        <div className="cs-doc-card">
                          <div className={`cs-doc-badge ${isMe ? 'bg-white/10 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'}`}>
                            <FileText size={18} className={isMe ? 'text-white' : 'text-slate-700 dark:text-slate-200'} />
                          </div>
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className={`text-xs font-bold truncate ${isMe ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                              {msg.fileName || msg.text || 'Document.pdf'}
                            </span>
                            <span className={`text-[10px] font-medium ${isMe ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                              {msg.fileSize || 'Attachment'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const targetUrl = msg.imageUrl || msg.photoUrl || msg.audioUrl || (msg.meta?.url as string) || (msg.meta?.mediaUrl as string) || (msg.meta?.fileUrl as string);
                              if (targetUrl) window.open(targetUrl, '_blank', 'noopener,noreferrer');
                            }}
                            className={`cs-doc-download-btn ${isMe ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-white'} cursor-pointer`}
                            title="Download / View attachment"
                            aria-label={`Open ${msg.fileName || 'attachment'}`}
                          >
                            <Download size={14} />
                          </button>
                        </div>
                        {msg.caption && msg.caption !== msg.fileName && (
                          <p className={`mt-1.5 text-xs ${isMe ? 'text-white/90' : 'text-slate-900 dark:text-slate-100'}`}>{msg.caption}</p>
                        )}
                      </div>
                    ) : msg.type === 'video' ? (
                      <div className="cs-photo-card">
                        <video
                          src={msg.imageUrl || msg.photoUrl || msg.audioUrl || (msg.meta?.url as string) || (msg.meta?.mediaUrl as string)}
                          controls
                          playsInline
                          className="rounded-xl max-h-64 w-full object-cover bg-black"
                        />
                        {msg.caption && msg.caption !== 'Video' && msg.caption !== '📹 Video' && !msg.caption.startsWith('attach_') && (
                          <p className={`mt-1.5 text-xs ${isMe ? 'text-white/90' : 'text-slate-900 dark:text-slate-100'}`}>{msg.caption}</p>
                        )}
                      </div>
                    ) : (msg.type === 'photo' || msg.imageUrl || msg.photoUrl || msg.meta?.imageUrl || msg.meta?.photoUrl) ? (
                      <div className="cs-photo-card">
                        <img
                          src={msg.imageUrl || msg.photoUrl || (msg.meta?.imageUrl as string) || (msg.meta?.photoUrl as string) || (msg.meta?.url as string) || (msg.meta?.mediaUrl as string)}
                          alt={msg.caption || 'Photo'}
                          className="rounded-xl max-h-64 w-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
                          onClick={() => {
                            const url = msg.imageUrl || msg.photoUrl || (msg.meta?.imageUrl as string) || (msg.meta?.photoUrl as string) || (msg.meta?.url as string) || (msg.meta?.mediaUrl as string);
                            if (url) window.open(url, '_blank');
                          }}
                        />
                        {msg.caption && msg.caption !== 'Photo' && msg.caption !== '📷 Photo' && !msg.caption.startsWith('attach_') && (
                          <p className={`mt-1.5 text-xs ${isMe ? 'text-white/90' : 'text-slate-900 dark:text-slate-100'}`}>{msg.caption}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-[13.5px] leading-relaxed select-text">
                        {msg.text}
                      </p>
                    )}
                  </div>

                  <div className="relative">
                    <button
                      className="cs-msg-hover-action"
                      title="Message options"
                      aria-label="Message options"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuMsgId((prev) => (prev === msg.id ? null : msg.id));
                      }}
                    >
                      <MoreVertical size={13} />
                    </button>

                    {activeMenuMsgId === msg.id && (
                      <div
                        className={`cs-msg-menu-popover absolute ${isMe ? 'right-0 top-full' : 'left-0 top-full'} mt-1 w-36 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100 text-slate-700 dark:text-slate-200 text-xs font-medium`}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        {msg.text && (
                          <button
                            type="button"
                            className="w-full px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                            onClick={() => {
                              if (msg.text) {
                                navigator.clipboard.writeText(msg.text);
                                setCopiedMsgId(msg.id);
                                setTimeout(() => setCopiedMsgId(null), 1500);
                              }
                              setActiveMenuMsgId(null);
                            }}
                          >
                            {copiedMsgId === msg.id ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} className="text-slate-400" />}
                            <span>{copiedMsgId === msg.id ? 'Copied' : 'Copy'}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          className="w-full px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                          onClick={() => {
                            setPinnedMsgIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(msg.id)) next.delete(msg.id);
                              else next.add(msg.id);
                              return next;
                            });
                            setActiveMenuMsgId(null);
                          }}
                        >
                          <Pin size={13} className={pinnedMsgIds.has(msg.id) ? 'text-amber-500 fill-amber-500' : 'text-slate-400'} />
                          <span>{pinnedMsgIds.has(msg.id) ? 'Unpin' : 'Pin'}</span>
                        </button>

                        <button
                          type="button"
                          className="w-full px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                          onClick={() => {
                            setStarredMsgIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(msg.id)) next.delete(msg.id);
                              else next.add(msg.id);
                              return next;
                            });
                            setActiveMenuMsgId(null);
                          }}
                        >
                          <Star size={13} className={starredMsgIds.has(msg.id) ? 'text-amber-500 fill-amber-500' : 'text-slate-400'} />
                          <span>{starredMsgIds.has(msg.id) ? 'Unstar' : 'Star'}</span>
                        </button>

                        {onDeleteMessage && (isMe || activeChat?.isAdmin) && (
                          <button
                            type="button"
                            className="w-full px-3 py-1.5 text-left hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2 cursor-pointer border-t border-slate-100 dark:border-slate-800/80 mt-1 pt-1.5"
                            onPointerDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onDeleteMessage(msg.id);
                              setActiveMenuMsgId(null);
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onDeleteMessage(msg.id);
                              setActiveMenuMsgId(null);
                            }}
                          >
                            <Trash2 size={13} />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

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

              {isMe && (
                <div className="cs-msg-avatar-wrap">
                  <img
                    src={senderAvatar}
                    alt="You"
                    className="w-9 h-9 rounded-full object-cover shadow-xs ring-1 ring-black/5 dark:ring-white/10"
                  />
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {showAttachMenu && (
        <div className="cs-attach-menu" ref={attachRef}>
          <button
            type="button"
            className="cs-attach-option cursor-pointer"
            onClick={() => docInputRef.current?.click()}
          >
            <div className="cs-attach-icon bg-indigo-500 text-white">
              <FileText size={16} />
            </div>
            <span>Document</span>
          </button>
          <button
            type="button"
            className="cs-attach-option cursor-pointer"
            onClick={() => mediaInputRef.current?.click()}
          >
            <div className="cs-attach-icon bg-emerald-500 text-white">
              <ImageIcon size={16} />
            </div>
            <span>Photos & Videos</span>
          </button>
          <button
            type="button"
            className="cs-attach-option cursor-pointer"
            onClick={() => setShowAttachMenu(false)}
          >
            <div className="cs-attach-icon bg-orange-500 text-white">
              <Mic size={16} />
            </div>
            <span>Audio Memo</span>
          </button>
          <button
            type="button"
            className="cs-attach-option"
            onClick={() => setShowAttachMenu(false)}
          >
            <div className="cs-attach-icon bg-orange-500 text-white">
              <User size={16} />
            </div>
            <span>Contact Card</span>
          </button>
          <button
            type="button"
            className="cs-attach-option"
            onClick={() => setShowAttachMenu(false)}
          >
            <div className="cs-attach-icon bg-orange-500 text-white">
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

      <input
        ref={mediaInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(event) => handleFileSelection(event, 'media')}
      />
      <input
        ref={docInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.tar,.gz,.json"
        className="hidden"
        onChange={(event) => handleFileSelection(event, 'document')}
      />

      {pendingAttachment && (
        <AttachmentPreviewDialog
          attachment={pendingAttachment}
          destinationName={activeChat.name}
          caption={inputText}
          isSending={isSendingAttachment}
          error={uploadError}
          onCaptionChange={setInputText}
          onReplace={handleReplaceAttachment}
          onCancel={clearPendingAttachment}
          onSend={handleSendAttachment}
        />
      )}

      {uploadError && !pendingAttachment && (
        <div role="alert" className="px-4 py-2 bg-rose-500/10 border-t border-rose-500/20 flex items-center justify-between gap-3 text-xs text-rose-600 dark:text-rose-400">
          <span>{uploadError}</span>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="flex size-8 shrink-0 items-center justify-center rounded-full cursor-pointer hover:bg-rose-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            aria-label="Dismiss attachment error"
          >
            <X size={13} aria-hidden="true" />
          </button>
        </div>
      )}

      <footer className="cs-composer-container">
        <form onSubmit={handleSend} className="cs-composer-bar">
          <button
            ref={attachmentButtonRef}
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

          {inputText.trim() ? (
            <button
              type="submit"
              disabled={isSendingText}
              className="cs-send-btn disabled:cursor-not-allowed disabled:opacity-60"
              title={isSendingText ? 'Sending message' : 'Send Message'}
              aria-label={isSendingText ? 'Sending message' : 'Send Message'}
            >
              {isSendingText ? (
                <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                <Send size={16} strokeWidth={2.5} aria-hidden="true" />
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (isRecording) {
                  setIsRecording(false);
                  void Promise.resolve(onSendMessage(`🎙️ Voice note (${recordingSeconds}s)`, 'audio', {
                    audioDuration: `0:${recordingSeconds.toString().padStart(2, '0')}`
                  })).catch((error) => {
                    setUploadError(error instanceof Error ? error.message : 'Failed to send voice note.');
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
