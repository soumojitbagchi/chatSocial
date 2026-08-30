import React, { useState, useRef } from 'react';
import {
  CircleDashed,
  Camera,
  Sparkles,
  ChevronRight,
  Plus,
  Image as ImageIcon,
  Type,
  X,
  Upload,
  Loader2,
  Check,
  Clock,
  ShieldCheck,
  Palette,
  ArrowRight
} from 'lucide-react';
import '../style/components.css';

export interface StatusSectionProps {
  myStatus: ApiUserStatusGroup | null;
  recentUpdates: ApiUserStatusGroup[];
  viewedUpdates: ApiUserStatusGroup[];
  onOpenDeck: (group: ApiUserStatusGroup, initialIndex?: number) => void;
  onCreateStory: (data: {
    file?: File | Blob | null;
    caption?: string;
    mediaType?: string;
    backgroundColor?: string;
    fontStyle?: string;
  }) => Promise<ApiStoryItem | null>;
  onDeleteStory: (statusId: string) => Promise<void>;
  currentUserAvatar?: string;
  currentUserName?: string;
  isUploading?: boolean;
}

const PRESET_BACKGROUNDS = [
  { label: 'Sunset Indigo', value: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' },
  { label: 'Emerald Mint', value: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' },
  { label: 'Ruby Rose', value: 'linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)' },
  { label: 'Amber Flame', value: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)' },
  { label: 'Ocean Cyan', value: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)' },
  { label: 'Midnight Blue', value: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' },
  { label: 'Dark Forest', value: 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)' },
  { label: 'Velvet Plum', value: 'linear-gradient(135deg, #701a75 0%, #4a044e 100%)' },
  { label: 'Pure Obsidian', value: '#0d0f14' },
];

const FONT_STYLES = [
  { id: 'sans-serif', name: 'Modern Sans' },
  { id: 'serif', name: 'Elegant Serif' },
  { id: 'monospace', name: 'Code Mono' },
  { id: 'cursive', name: 'Handwritten' },
];

export const StatusSection: React.FC<StatusSectionProps> = ({
  myStatus,
  recentUpdates,
  viewedUpdates,
  onOpenDeck,
  onCreateStory,
  onDeleteStory: _onDeleteStory,
  currentUserAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  currentUserName = 'You',
  isUploading = false,
}) => {
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [createMode, setCreateMode] = useState<'media' | 'text'>('media');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [captionText, setCaptionText] = useState<string>('');
  const [textContent, setTextContent] = useState<string>('');
  const [bgColor, setBgColor] = useState<string>(PRESET_BACKGROUNDS[0].value);
  const [fontFamily, setFontStyle] = useState<string>('sans-serif');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showViewedList, setShowViewedList] = useState<boolean>(true);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const myStoriesCount = myStatus?.stories?.length || 0;
  const hasMyStories = myStoriesCount > 0;

  // Process chosen file safely
  const processFile = (file: File) => {
    setErrorMessage(null);
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 25MB limit. Please choose a smaller image or video.');
      return;
    }

    const validMimes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
      'video/mp4', 'video/webm', 'video/quicktime'
    ];
    if (!validMimes.includes(file.type.toLowerCase()) && !file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setErrorMessage('Unsupported file format. Please choose a JPEG, PNG, WebP, GIF image, or MP4/WebM video.');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setCreateMode('media');
    setShowCreateModal(true);
  };

  // Handle file picker selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Reset file input value so re-selecting same file triggers event
    if (e.target) e.target.value = '';
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Submit new status
  const handlePublishStatus = async () => {
    if (createMode === 'media' && !selectedFile) return;
    if (createMode === 'text' && !textContent.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      if (createMode === 'media' && selectedFile) {
        const isVideo = selectedFile.type.startsWith('video/');
        await onCreateStory({
          file: selectedFile,
          caption: captionText.trim(),
          mediaType: isVideo ? 'video' : 'image',
        });
      } else {
        await onCreateStory({
          caption: textContent.trim(),
          mediaType: 'text',
          backgroundColor: bgColor,
          fontStyle: fontFamily,
        });
      }

      // Cleanup and close
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setSelectedFile(null);
      setPreviewUrl(null);
      setCaptionText('');
      setTextContent('');
      setShowCreateModal(false);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to publish status update');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setCaptionText('');
    setTextContent('');
    setErrorMessage(null);
    setShowCreateModal(false);
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-slate-50 dark:bg-[#0b0d11]">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/jpg,video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ========================================================================= */}
      {/* LEFT SIDEBAR: STATUS FEED & QUICK CREATION */}
      {/* ========================================================================= */}
      <section className="w-full md:w-84 lg:w-96 border-r border-slate-200 dark:border-[#1e222a] bg-white dark:bg-[#12151b] flex flex-col shrink-0">
        {/* Header Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-[#181b22]">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CircleDashed size={20} className="animate-spin-slow" />
              </span>
              <span>Status Stories</span>
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1.5">
            <Clock size={12} className="text-slate-400 shrink-0" />
            <span>Updates expire automatically after 24 hours</span>
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* ========================================================================= */}
          {/* PROMINENT CREATION ACTION CARDS (LARGE SIZE & VIBRANT STYLING) */}
          {/* ========================================================================= */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
              Create New Story
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Option A: Upload Photo / Video */}
              <button
                type="button"
                onClick={() => {
                  setCreateMode('media');
                  fileInputRef.current?.click();
                }}
                className="group p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 dark:from-emerald-950/40 dark:to-teal-950/20 border border-emerald-500/30 hover:border-emerald-500/60 transition-all duration-200 flex flex-col items-start text-left shadow-xs hover:shadow-md cursor-pointer active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center mb-2.5 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                  <Camera size={20} strokeWidth={2.2} />
                </div>
                <h5 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Photo / Video
                </h5>
                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                  Upload photos, clips & media
                </p>
              </button>

              {/* Option B: Write Text Story */}
              <button
                type="button"
                onClick={() => {
                  setCreateMode('text');
                  setShowCreateModal(true);
                }}
                className="group p-3.5 rounded-2xl bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-indigo-500/10 hover:from-violet-500/20 hover:to-indigo-500/20 dark:from-violet-950/40 dark:to-indigo-950/20 border border-violet-500/30 hover:border-violet-500/60 transition-all duration-200 flex flex-col items-start text-left shadow-xs hover:shadow-md cursor-pointer active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 text-white flex items-center justify-center mb-2.5 shadow-md shadow-violet-500/20 group-hover:scale-105 transition-transform">
                  <Type size={20} strokeWidth={2.2} />
                </div>
                <h5 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                  Text Status
                </h5>
                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                  Custom fonts & color gradients
                </p>
              </button>
            </div>
          </div>

          {/* 1. My Status Card */}
          <div className="p-3 rounded-2xl bg-slate-100/80 dark:bg-[#181c24] border border-slate-200 dark:border-[#262c38] flex items-center justify-between gap-3 group transition-colors">
            <div
              className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
              onClick={() => {
                if (hasMyStories && myStatus) {
                  onOpenDeck(myStatus, 0);
                } else {
                  fileInputRef.current?.click();
                }
              }}
            >
              <div className="relative shrink-0">
                <div
                  className={`w-13 h-13 rounded-full p-0.5 ${
                    hasMyStories
                      ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-white dark:ring-offset-[#12151b]'
                      : 'border-2 border-dashed border-slate-300 dark:border-slate-600'
                  }`}
                >
                  <img
                    src={currentUserAvatar}
                    alt={currentUserName}
                    className="w-full h-full rounded-full object-cover shadow-xs"
                  />
                </div>
                {!hasMyStories && (
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold ring-2 ring-white dark:ring-[#12151b] shadow-xs">
                    <Plus size={12} strokeWidth={3} />
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  My Status
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {hasMyStories
                    ? `${myStoriesCount} active update${myStoriesCount > 1 ? 's' : ''} • Tap to view`
                    : 'Tap to add your 24h story'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-8 h-8 rounded-full hover:bg-slate-200 dark:hover:bg-[#262c38] text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer transition-colors"
                title="Add new story slide"
              >
                <Camera size={16} />
              </button>
            </div>
          </div>

          {/* 2. Recent Updates (Unviewed) */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
              Recent Updates
            </h4>
            {recentUpdates.length === 0 ? (
              <p className="text-xs text-slate-400 p-3 bg-slate-50 dark:bg-[#181c24] rounded-xl border border-slate-200/60 dark:border-[#262c38]">
                No recent status updates from contacts.
              </p>
            ) : (
              recentUpdates.map((group) => {
                const latestSlide = group.stories[group.stories.length - 1];
                return (
                  <div
                    key={group.userId}
                    onClick={() => onOpenDeck(group, 0)}
                    className="p-3 rounded-xl flex items-center justify-between hover:bg-slate-100 dark:hover:bg-[#161922] transition-colors cursor-pointer group border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative p-0.5 rounded-full ring-2 ring-emerald-500 ring-offset-2 ring-offset-white dark:ring-offset-[#12151b] shrink-0">
                        <img
                          src={group.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                          alt={group.userName}
                          className="w-11 h-11 rounded-full object-cover"
                        />
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {group.userName}
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {latestSlide?.timeAgo || 'Recently'} • {group.stories.length} update{group.stories.length > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    <ChevronRight size={16} className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all" />
                  </div>
                );
              })
            )}
          </div>

          {/* 3. Viewed Updates */}
          {viewedUpdates.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-[#181b22]">
              <button
                type="button"
                onClick={() => setShowViewedList((prev) => !prev)}
                className="w-full flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider px-1 cursor-pointer hover:text-slate-600 dark:hover:text-slate-200"
              >
                <span>Viewed Updates ({viewedUpdates.length})</span>
                <ChevronRight size={14} className={`transform transition-transform ${showViewedList ? 'rotate-90' : ''}`} />
              </button>

              {showViewedList && (
                <div className="space-y-1">
                  {viewedUpdates.map((group) => {
                    const latestSlide = group.stories[group.stories.length - 1];
                    return (
                      <div
                        key={group.userId}
                        onClick={() => onOpenDeck(group, 0)}
                        className="p-3 rounded-xl flex items-center justify-between hover:bg-slate-100 dark:hover:bg-[#161922] opacity-75 hover:opacity-100 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative p-0.5 rounded-full ring-2 ring-slate-300 dark:ring-slate-700 ring-offset-2 ring-offset-white dark:ring-offset-[#12151b] shrink-0">
                            <img
                              src={group.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                              alt={group.userName}
                              className="w-11 h-11 rounded-full object-cover"
                            />
                          </div>

                          <div className="min-w-0">
                            <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                              {group.userName}
                            </h4>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {latestSlide?.timeAgo || 'Viewed'} • {group.stories.length} update{group.stories.length > 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>

                        <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* RIGHT CANVAS: CREATIVE STUDIO & DISCOVERY HERO */}
      {/* ========================================================================= */}
      <section className="flex-1 hidden md:flex flex-col items-center justify-center p-8 bg-white dark:bg-[#0b0d11] text-center overflow-y-auto">
        <div className="max-w-md w-full flex flex-col items-center">
          <div className="w-18 h-18 rounded-3xl bg-gradient-to-tr from-emerald-500/20 via-teal-500/20 to-indigo-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-5 shadow-lg shadow-emerald-500/10">
            <Sparkles size={36} />
          </div>
          
          <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2.5">
            Share Your Daily Story
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed mb-8">
            Post photos, quick video clips, or styled thoughts with your contacts. Encrypted and automatically expires after 24 hours.
          </p>

          {/* Large Hero Action Cards */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            <button
              type="button"
              onClick={() => {
                setCreateMode('media');
                fileInputRef.current?.click();
              }}
              className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 dark:from-emerald-950/40 dark:to-teal-950/20 border border-emerald-500/30 hover:border-emerald-500/60 transition-all duration-200 flex flex-col items-center text-center shadow-sm hover:shadow-lg cursor-pointer group active:scale-[0.98]"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center mb-3 shadow-md shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                <Camera size={24} strokeWidth={2.2} />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                Upload Photo / Video
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
                Share moments up to 25MB
              </p>
              <span className="mt-3 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 group-hover:gap-1.5 transition-all">
                <span>Select file</span>
                <ArrowRight size={12} />
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCreateMode('text');
                setShowCreateModal(true);
              }}
              className="p-5 rounded-2xl bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-indigo-500/10 hover:from-violet-500/20 hover:to-indigo-500/20 dark:from-violet-950/40 dark:to-indigo-950/20 border border-violet-500/30 hover:border-violet-500/60 transition-all duration-200 flex flex-col items-center text-center shadow-sm hover:shadow-lg cursor-pointer group active:scale-[0.98]"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 text-white flex items-center justify-center mb-3 shadow-md shadow-violet-500/20 group-hover:scale-110 transition-transform">
                <Type size={24} strokeWidth={2.2} />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                Write Text Story
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
                Gradients & typography
              </p>
              <span className="mt-3 text-[11px] font-bold text-violet-600 dark:text-violet-400 flex items-center gap-1 group-hover:gap-1.5 transition-all">
                <span>Open canvas</span>
                <ArrowRight size={12} />
              </span>
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>Zero-Knowledge Encryption</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Clock size={14} className="text-emerald-500" />
              <span>24h Auto-Expiry</span>
            </span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* STATUS CREATOR MODAL (ENHANCED UI, LARGE DROPTARGET, RICH COLORS) */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div
            className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#111317] border border-slate-200 dark:border-[#222630] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-900 dark:text-white"
            role="dialog"
            aria-label="Create Status Update"
          >
            {/* Modal Header with Big Segmented Mode Switcher */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-[#1d222c] flex items-center justify-between">
              <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-[#191d26] border border-slate-200/60 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateMode('media')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    createMode === 'media'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <ImageIcon size={16} />
                  <span>Photo / Video</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCreateMode('text')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    createMode === 'text'
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/20'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Type size={16} />
                  <span>Text Status</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleCloseModal}
                className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-[#1d222c] text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Error Message Toast */}
            {errorMessage && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                <X size={14} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {createMode === 'media' ? (
                <div className="space-y-4">
                  {previewUrl ? (
                    <div className="relative rounded-2xl overflow-hidden bg-black max-h-84 flex items-center justify-center border border-slate-200 dark:border-white/10 shadow-inner">
                      {selectedFile?.type.startsWith('video/') ? (
                        <video src={previewUrl} controls autoPlay className="max-h-84 w-full object-contain" />
                      ) : (
                        <img src={previewUrl} alt="Preview" className="max-h-84 w-full object-contain" />
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (previewUrl) URL.revokeObjectURL(previewUrl);
                          setSelectedFile(null);
                          setPreviewUrl(null);
                        }}
                        className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-md cursor-pointer transition-colors shadow-lg"
                        title="Remove media and pick another"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all ${
                        isDragOver
                          ? 'border-emerald-500 bg-emerald-500/10 scale-[1.01]'
                          : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-slate-50/80 dark:bg-[#161a22]'
                      }`}
                    >
                      <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-4 shadow-sm">
                        <Upload size={28} />
                      </div>
                      <h4 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
                        Choose photo or video
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mb-3">
                        Drag and drop files here, or click to browse from your device
                      </p>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200/60 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        <span>JPEG, PNG, WebP, GIF, MP4 (max 25MB)</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Caption (optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Add a caption to your status..."
                      value={captionText}
                      onChange={(e) => setCaptionText(e.target.value)}
                      className="w-full h-12 px-4 rounded-xl bg-slate-100 dark:bg-[#181c24] border border-slate-200 dark:border-[#262c38] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Text Canvas Preview */}
                  <div
                    className="relative rounded-3xl p-8 min-h-[240px] flex items-center justify-center text-center shadow-xl transition-all border border-white/10"
                    style={{
                      background: bgColor,
                    }}
                  >
                    <textarea
                      placeholder="Type your story update here..."
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      maxLength={500}
                      rows={4}
                      className="w-full bg-transparent border-0 text-white placeholder:text-white/60 text-xl sm:text-2xl font-black text-center focus:outline-none resize-none drop-shadow-md leading-relaxed"
                      style={{ fontFamily }}
                      autoFocus
                    />
                  </div>

                  {/* Font Style Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                      <Type size={14} className="text-violet-500" />
                      <span>Typography Style</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {FONT_STYLES.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setFontStyle(f.id)}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            fontFamily === f.id
                              ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                              : 'bg-slate-100 dark:bg-[#181c24] border-slate-200 dark:border-[#262c38] text-slate-700 dark:text-slate-300 hover:border-violet-400'
                          }`}
                          style={{ fontFamily: f.id }}
                        >
                          {f.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Background Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                      <Palette size={14} className="text-violet-500" />
                      <span>Canvas Background Color</span>
                    </label>
                    <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-1">
                      {PRESET_BACKGROUNDS.map((bg, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setBgColor(bg.value)}
                          title={bg.label}
                          className={`w-9 h-9 rounded-full shrink-0 transition-transform cursor-pointer shadow-md ${
                            bgColor === bg.value ? 'ring-3 ring-violet-500 ring-offset-2 ring-offset-white dark:ring-offset-[#111317] scale-110' : 'hover:scale-105'
                          }`}
                          style={{ background: bg.value }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer / Prominent Vibrant Button */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-[#1d222c] flex items-center justify-end gap-3 bg-slate-50 dark:bg-[#0f1115]">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-[#1c202a] cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  isSubmitting ||
                  isUploading ||
                  (createMode === 'media' && !selectedFile) ||
                  (createMode === 'text' && !textContent.trim())
                }
                onClick={handlePublishStatus}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2 cursor-pointer ${
                  createMode === 'media'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/25'
                    : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-violet-600/25'
                }`}
              >
                {isSubmitting || isUploading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Uploading Status...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} strokeWidth={2.5} />
                    <span>Publish Story (24h)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusSection;
