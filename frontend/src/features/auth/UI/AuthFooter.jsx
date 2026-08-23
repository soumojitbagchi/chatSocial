import React from 'react';
import { ArrowUpRight, Lock } from 'lucide-react';
import '../style/auth.css';

const AuthFooter = () => {
  return (
    <footer className="auth-footer" role="contentinfo">
      {/* Get Started Prompt */}
      <div className="auth-footer-prompt">
        <span>Don't have a chatSocial account?</span>
        <a 
          href="https://www.whatsapp.com/download" 
          target="_blank" 
          rel="noopener noreferrer"
          className="auth-footer-prompt-link"
        >
          <span>Get started</span>
          <ArrowUpRight size={15} />
        </a>
      </div>

      {/* End to End Encryption Notice */}
      <div className="auth-footer-encrypted">
        <Lock size={14} color="var(--auth-text-secondary)" />
        <span>Your personal messages are end-to-end encrypted</span>
      </div>

      {/* Terms and Privacy Policy */}
      <a 
        href="https://www.whatsapp.com/legal" 
        target="_blank" 
        rel="noopener noreferrer"
        className="auth-footer-terms"
      >
        Terms &amp; Privacy Policy
      </a>
    </footer>
  );
};

export default AuthFooter;
