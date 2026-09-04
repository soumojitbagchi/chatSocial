import React, { useCallback, useState } from 'react';
import { FileWarning } from 'lucide-react';

interface ChatImageProps {
  src?: string;
  alt?: string;
  fileName?: string;
  maxWidth?: number;
  maxHeight?: number;
  onOpenFull?: (url: string) => void;
}

const DEFAULT_MAX_W = 320;
const DEFAULT_MAX_H = 240;

/**
 * Sized chat image: fetches via <img>, shapes the box from the file's
 * natural dimensions, but never exceeds the px preview cap.
 * Broken URLs render an explicit fallback instead of a blank bubble.
 */
export const ChatImage: React.FC<ChatImageProps> = ({
  src,
  alt = 'Photo',
  fileName,
  maxWidth = DEFAULT_MAX_W,
  maxHeight = DEFAULT_MAX_H,
  onOpenFull,
}) => {
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [failed, setFailed] = useState(false);

  const handleLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    }
  }, []);

  const handleError = useCallback(() => {
    setFailed(true);
  }, []);

  if (!src || failed) {
    return (
      <button
        type="button"
        onClick={() => src && !failed && onOpenFull?.(src)}
        className="flex w-full max-w-[320px] items-center gap-2.5 rounded-xl bg-slate-100 p-3 text-left dark:bg-slate-800"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500">
          <FileWarning size={17} />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-xs font-bold">
            {!src ? 'Image unavailable' : 'Could not load image'}
          </span>
          <span className="block truncate text-[11px] text-slate-500">
            {fileName || 'Tap to retry / open original'}
          </span>
        </span>
      </button>
    );
  }

  // Shape box from natural size, capped to preview limits.
  let width: number | undefined;
  let height: number | undefined;
  if (natural) {
    const scale = Math.min(maxWidth / natural.w, maxHeight / natural.h, 1);
    width = Math.max(1, Math.round(natural.w * scale));
    height = Math.max(1, Math.round(natural.h * scale));
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onLoad={handleLoad}
      onError={handleError}
      onClick={() => onOpenFull?.(src)}
      width={width}
      height={height}
      style={{
        width: width ? `${width}px` : '100%',
        height: height ? `${height}px` : 'auto',
        maxWidth: `min(100%, ${maxWidth}px)`,
        maxHeight: `${maxHeight}px`,
      }}
      className="cursor-pointer rounded-xl bg-black/5 object-contain transition-opacity hover:opacity-95 dark:bg-white/5"
    />
  );
};

export default ChatImage;
