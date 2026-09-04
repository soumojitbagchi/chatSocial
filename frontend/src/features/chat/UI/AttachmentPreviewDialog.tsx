import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  FileText,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  Send,
  Video,
  X,
} from 'lucide-react';

export type PendingAttachmentKind = 'media' | 'document';
export type PendingMessageType = 'photo' | 'video' | 'document';

export interface PendingAttachment {
  file: File;
  kind: PendingAttachmentKind;
  messageType: PendingMessageType;
  previewUrl: string | null;
}

export interface AttachmentPreviewDialogProps {
  attachment: PendingAttachment;
  destinationName: string;
  caption: string;
  isSending: boolean;
  error: string | null;
  onCaptionChange: (value: string) => void;
  onReplace: () => void;
  onCancel: () => void;
  onSend: () => void;
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileTypeLabel = (attachment: PendingAttachment) => {
  if (attachment.messageType === 'photo') return 'Photo';
  if (attachment.messageType === 'video') return 'Video';
  const extension = attachment.file.name.split('.').pop()?.toUpperCase();
  return extension ? `${extension} document` : 'Document';
};

export const AttachmentPreviewDialog: React.FC<AttachmentPreviewDialogProps> = ({
  attachment,
  destinationName,
  caption,
  isSending,
  error,
  onCaptionChange,
  onReplace,
  onCancel,
  onSend,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLTextAreaElement>(null);
  const onCancelRef = useRef(onCancel);
  const isSendingRef = useRef(isSending);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    isSendingRef.current = isSending;
  }, [isSending]);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const dialog = dialogRef.current;
    const appRoot = document.getElementById('root');
    const rootWasInert = appRoot?.inert || false;
    const previousBodyOverflow = document.body.style.overflow;

    if (appRoot) appRoot.inert = true;
    document.body.style.overflow = 'hidden';
    window.requestAnimationFrame(() => captionRef.current?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (!isSendingRef.current) {
          event.preventDefault();
          onCancelRef.current();
        }
        return;
      }

      if (event.key !== 'Tab' || !dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute('hidden'));

      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;

      if (!activeElement || !dialog.contains(activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (appRoot) appRoot.inert = rootWasInert;
      document.body.style.overflow = previousBodyOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, []);

  const typeLabel = getFileTypeLabel(attachment);
  const fileDetails = `${typeLabel} · ${formatFileSize(attachment.file.size)}`;

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-slate-950/85 p-2 backdrop-blur-md sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSending) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="attachment-preview-title"
        aria-describedby="attachment-preview-description"
        aria-busy={isSending}
        tabIndex={-1}
        className="my-auto flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-[#12151b] dark:text-white"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-5">
          <div className="min-w-0">
            <h2 id="attachment-preview-title" className="truncate text-sm font-bold sm:text-base">
              Send to {destinationName}
            </h2>
            <p id="attachment-preview-description" className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Full-size preview. Send forwards it, Cancel goes back without sending.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSending}
            className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="Close attachment preview"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="flex min-h-64 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-[#0b0d11] sm:min-h-96">
            {attachment.messageType === 'photo' && attachment.previewUrl ? (
              <img
                src={attachment.previewUrl}
                alt={`Preview of ${attachment.file.name}`}
                className="max-h-[68vh] w-full object-contain"
              />
            ) : attachment.messageType === 'video' && attachment.previewUrl ? (
              <video
                src={attachment.previewUrl}
                controls
                playsInline
                preload="metadata"
                aria-label={`Preview of ${attachment.file.name}`}
                className="max-h-[68vh] w-full bg-black object-contain"
              />
            ) : (
              <div className="flex max-w-full flex-col items-center px-6 py-10 text-center">
                <span className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <FileText size={30} aria-hidden="true" />
                </span>
                <p className="max-w-full break-words text-sm font-bold text-slate-900 dark:text-white">
                  {attachment.file.name}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{fileDetails}</p>
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                {attachment.messageType === 'photo' ? (
                  <ImageIcon size={17} aria-hidden="true" />
                ) : attachment.messageType === 'video' ? (
                  <Video size={17} aria-hidden="true" />
                ) : (
                  <FileText size={17} aria-hidden="true" />
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {attachment.file.name}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{fileDetails}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onReplace}
              disabled={isSending}
              className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-lg px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Paperclip size={15} aria-hidden="true" />
              <span>Replace</span>
            </button>
          </div>

          <div className="mt-4">
            <label htmlFor="attachment-caption" className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Caption <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              ref={captionRef}
              id="attachment-caption"
              value={caption}
              onChange={(event) => onCaptionChange(event.target.value)}
              disabled={isSending}
              rows={2}
              placeholder="Add a caption…"
              className="min-h-12 w-full resize-none rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
            />
          </div>

          {error && (
            <div role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-300">
              {error} Your file and caption are still here, so you can try again.
            </div>
          )}
        </div>

        <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-[#0f1117] sm:px-5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSending}
            className="min-h-11 cursor-pointer rounded-xl px-4 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSend}
            disabled={isSending}
            className="inline-flex min-h-11 min-w-28 cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:ring-offset-[#12151b]"
          >
            {isSending ? (
              <>
                <Loader2 size={17} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                <span>Sending…</span>
              </>
            ) : (
              <>
                <Send size={17} strokeWidth={2.5} aria-hidden="true" />
                <span>Send</span>
              </>
            )}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
};

export default AttachmentPreviewDialog;
