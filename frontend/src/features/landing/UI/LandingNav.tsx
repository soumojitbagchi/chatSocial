import * as React from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { ChatSocialLogo } from "@/components/ui/logo";

export interface LandingNavProps {
  onSignIn: () => void;
  onSignUp: () => void;
  onOpenApp: () => void;
}

export function LandingNav({ onSignIn, onSignUp, onOpenApp }: LandingNavProps) {
  const navItems = [
    { label: "About", href: "#about" },
    { label: "Features", href: "#features" },
    { label: "Security", href: "#security" },
    { label: "Community", href: "#community" },
    { label: "Contact", href: "#contact" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 py-5 px-6 sm:px-12 flex items-center justify-between pointer-events-none select-none">
      {/* Left: Brand Logo */}
      <div className="pointer-events-auto">
        <a href="#" className="flex items-center gap-2 cursor-pointer focus:outline-none group">
          <ChatSocialLogo size={28} />
        </a>
      </div>

      {/* Center: Clean Editorial Menu Links */}
      <nav className="hidden lg:flex items-center gap-8 pointer-events-auto">
        {navItems.map((item) => (
          <a
            key={item.label}
            href={item.href}
            className="text-sm font-medium text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            {item.label}
          </a>
        ))}
      </nav>

      {/* Right: Action Buttons matching the reference */}
      <div className="flex items-center gap-3 sm:gap-4 pointer-events-auto">
        <button
          onClick={onSignIn}
          className="text-sm font-medium text-white/80 hover:text-white px-3 py-2 transition-colors cursor-pointer"
        >
          Sign in
        </button>

        <button
          onClick={onSignUp}
          className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-black rounded-full bg-white hover:bg-white/90 shadow-lg shadow-white/10 transition-all flex items-center gap-1.5 cursor-pointer group"
        >
          <span>Try it free</span>
          <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
        </button>

        <button
          onClick={onOpenApp}
          className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-xs font-mono text-emerald-400 border border-emerald-500/30 hover:border-emerald-400/60 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 backdrop-blur-md transition-all cursor-pointer"
        >
          <Sparkles size={13} />
          <span>Launch Web</span>
        </button>
      </div>
    </header>
  );
}

export default LandingNav;
