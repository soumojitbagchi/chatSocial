import * as React from "react";

export interface LogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

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
      <path
        d="M14.5 14C8.7 14 4 18.7 4 24.5C4 30.3 8.7 35 14.5 35C19.3 35 23.3 31.7 24 27.5C24.7 31.7 28.7 35 33.5 35C39.3 35 44 30.3 44 24.5C44 18.7 39.3 14 33.5 14C28.7 14 24.7 17.3 24 21.5C23.3 17.3 19.3 14 14.5 14ZM14.5 29C12 29 10 27 10 24.5C10 22 12 20 14.5 20C17.2 20 19.4 22 20.1 24.5C19.4 27 17.2 29 14.5 29ZM33.5 29C30.8 29 28.6 27 27.9 24.5C28.6 22 30.8 20 33.5 20C36 20 38 22 38 24.5C38 27 36 29 33.5 29Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ChatSocialLogo({ size = 32, className = "", ...props }: LogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div className="flex items-center justify-center text-[#f2552c]">
        <InfinityGradientLogo size={size} {...props} />
      </div>
      <span className="font-bold tracking-[-0.04em] text-foreground text-xl">
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
