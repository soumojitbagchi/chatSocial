import * as React from "react";
import { ArrowUpRight, Check, Mic, Paperclip, Send } from "lucide-react";
import { useNavigate } from "react-router";
import { LandingNav } from "./LandingNav";

export interface LandingPageProps {
  onSignIn?: () => void;
  onSignUp?: () => void;
  onOpenApp?: () => void;
}

export function LandingPage({ onSignIn, onSignUp, onOpenApp }: LandingPageProps) {
  const navigate = useNavigate();
  const open = (callback: (() => void) | undefined, path: string) => callback ? callback() : navigate(path);

  return (
    <div className="landing-shell">
      <LandingNav
        onSignIn={() => open(onSignIn, "/signin")}
        onSignUp={() => open(onSignUp, "/signup")}
        onOpenApp={() => open(onOpenApp, "/chat")}
      />

      <main className="landing-main">
        <section className="landing-copy" aria-labelledby="landing-title">
          <p className="landing-kicker">
            <span />
            Your people, one place
          </p>
          <h1 id="landing-title">Stay close.<br />Without living online.</h1>
          <p className="landing-intro">
            A calmer place for the conversations that matter.
            Message friends, share the moment, and pick up exactly where you left off.
          </p>
          <div className="landing-actions">
            <button className="landing-primary" onClick={() => open(onOpenApp, "/chat")}>
              Open chat
              <ArrowUpRight size={18} aria-hidden="true" />
            </button>
            <button className="landing-secondary" onClick={() => open(onSignUp, "/signup")}>Create an account</button>
          </div>
          <p className="landing-note"><Check size={15} /> Free to start. No clutter, no learning curve.</p>
        </section>

        <section className="landing-preview" aria-label="Chat preview">
          <div className="landing-card-shadow" />
          <div className="landing-chat-card">
            <header className="landing-chat-header">
              <div className="landing-avatar landing-avatar-photo">M</div>
              <div>
                <strong>Maya</strong>
                <span>online now</span>
              </div>
              <button aria-label="More conversation options">•••</button>
            </header>
            <div className="landing-chat-date">Today</div>
            <div className="landing-chat-feed">
              <div className="landing-bubble received">Dinner on the roof tonight?</div>
              <div className="landing-bubble sent">Yes. I’ll bring the good playlist.</div>
              <div className="landing-voice">
                <button aria-label="Play voice note">▶</button>
                <span className="landing-wave" />
                <small>0:18</small>
              </div>
              <div className="landing-typing"><i /><i /><i /></div>
            </div>
            <footer className="landing-composer">
              <Paperclip size={18} />
              <span>Write a message</span>
              <Mic size={18} />
              <button aria-label="Send message"><Send size={16} /></button>
            </footer>
          </div>
          <div className="landing-presence-note">
            <div className="landing-avatar landing-avatar-small">J</div>
            <span><strong>Jon joined</strong> the conversation</span>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <p>Conversation, without the noise.</p>
        <div><span>Direct messages</span><span>Groups</span><span>Voice notes</span></div>
        <small>© {new Date().getFullYear()} chatSocial</small>
      </footer>
    </div>
  );
}

export default LandingPage;
