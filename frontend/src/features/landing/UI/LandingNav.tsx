import * as React from "react";
import { ArrowUpRight } from "lucide-react";
import { ChatSocialLogo } from "@/components/ui/logo";

export interface LandingNavProps {
  onSignIn: () => void;
  onSignUp: () => void;
  onOpenApp: () => void;
}

export function LandingNav({ onSignIn, onOpenApp }: LandingNavProps) {
  return (
    <header className="landing-nav">
      <button className="landing-brand" onClick={onOpenApp} aria-label="Open chatSocial">
        <ChatSocialLogo size={24} />
      </button>
      <nav aria-label="Account navigation">
        <button className="landing-signin" onClick={onSignIn}>Sign in</button>
        <button className="landing-nav-cta" onClick={onOpenApp}>
          Open app
          <ArrowUpRight size={16} aria-hidden="true" />
        </button>
      </nav>
    </header>
  );
}

export default LandingNav;
