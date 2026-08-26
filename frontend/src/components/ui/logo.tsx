import * as React from "react";

export interface LogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

/**
 * Infinity Loop Gradient Logo as shown in the top-left rail of the reference
 */
export function InfinityGradientLogo({ size = 30, className = "", ...props }: LogoProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="infinityGrad" x1="4" y1="24" x2="44" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="45%" stopColor="#3b82f6" />
          <stop offset="80%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <path
        d="M14.5 14C8.7 14 4 18.7 4 24.5C4 30.3 8.7 35 14.5 35C19.3 35 23.3 31.7 24 27.5C24.7 31.7 28.7 35 33.5 35C39.3 35 44 30.3 44 24.5C44 18.7 39.3 14 33.5 14C28.7 14 24.7 17.3 24 21.5C23.3 17.3 19.3 14 14.5 14ZM14.5 29C12 29 10 27 10 24.5C10 22 12 20 14.5 20C17.2 20 19.4 22 20.1 24.5C19.4 27 17.2 29 14.5 29ZM33.5 29C30.8 29 28.6 27 27.9 24.5C28.6 22 30.8 20 33.5 20C36 20 38 22 38 24.5C38 27 36 29 33.5 29Z"
        fill="url(#infinityGrad)"
      />
    </svg>
  );
}

export function ChatSocialLogo({ size = 32, className = "", ...props }: LogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div className="relative flex items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-500 to-cyan-400 p-1.5 shadow-md shadow-indigo-500/20 ring-1 ring-black/5 dark:ring-white/20">
        <InfinityGradientLogo size={size} {...props} />
      </div>
      <span className="font-bold tracking-tight text-foreground text-xl bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text">
        chatSocial
      </span>
    </div>
  );
}

export function ChatSocialIcon({ size = 24, className = "", ...props }: LogoProps) {
  return <InfinityGradientLogo size={size} className={className} {...props} />;
}

// Aliases for compatibility
export const ChatChosenLogo = ChatSocialLogo;
export const ChatChosenIcon = InfinityGradientLogo;
export const Logo = ChatSocialLogo;
