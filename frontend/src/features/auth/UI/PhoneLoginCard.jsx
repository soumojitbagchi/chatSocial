import React, { useState } from 'react';
import { ChevronLeft, ArrowRight, Smartphone } from 'lucide-react';
import '../style/auth.css';

const PhoneLoginCard = ({ onSwitchToQR, onLoginSuccess }) => {
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [linkingCode, setLinkingCode] = useState('');
  const [step, setStep] = useState('input'); // 'input' | 'code'

  const handleSubmitPhone = (e) => {
    e?.preventDefault();
    if (!phoneNumber.trim()) return;
    // Generate random 8-character pairing code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      if (i === 4) code += '-';
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setLinkingCode(code);
    setStep('code');
  };

  return (
    <article className="auth-card" aria-label="Phone Number Login Card">
      <div className="auth-card-left" style={{ flex: 1.5 }}>
        <h2 className="auth-card-title">Enter phone number</h2>
        
        {step === 'input' ? (
          <form className="auth-phone-form" onSubmit={handleSubmitPhone}>
            <p style={{ color: 'var(--auth-text-secondary)', fontSize: '0.92rem', margin: '-1rem 0 0.5rem 0', lineHeight: 1.5 }}>
              Select a country and enter your phone number to receive a pairing code.
            </p>

            <div className="auth-phone-input-group">
              <label>Country & Phone Number</label>
              <div className="auth-phone-row">
                <select 
                  className="auth-phone-country-select"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                >
                  <option value="+91">🇮🇳 India (+91)</option>
                  <option value="+1">🇺🇸 USA (+1)</option>
                  <option value="+44">🇬🇧 UK (+44)</option>
                  <option value="+49">🇩🇪 Germany (+49)</option>
                  <option value="+81">🇯🇵 Japan (+81)</option>
                </select>
                <input 
                  type="tel"
                  className="auth-phone-input"
                  placeholder="e.g. 98765 43210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <button type="submit" className="auth-phone-submit-btn">
              Next
            </button>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <p style={{ color: 'var(--auth-text-secondary)', fontSize: '0.92rem', margin: 0, lineHeight: 1.5 }}>
              Enter this code on your phone to link your account:
            </p>

            <div style={{ 
              letterSpacing: '0.25em', 
              fontSize: '1.8rem', 
              fontWeight: 700, 
              color: 'var(--auth-green)',
              background: '#f0f2f5',
              padding: '1rem 1.5rem',
              borderRadius: 8,
              textAlign: 'center',
              border: '1px dashed var(--auth-green)'
            }}>
              {linkingCode}
            </div>

            <button 
              type="button" 
              className="auth-phone-submit-btn"
              onClick={onLoginSuccess}
            >
              Continue to chatSocial
            </button>
          </div>
        )}
      </div>

      <div className="auth-card-right" style={{ flex: 0.8, borderLeft: '1px solid var(--auth-border-subtle)', paddingLeft: '2rem' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(0,128,105,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--auth-green)', marginBottom: '1rem' }}>
          <Smartphone size={32} />
        </div>
        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', fontWeight: 600 }}>Pair with phone</h4>
        <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.86rem', color: 'var(--auth-text-secondary)', textAlign: 'center', lineHeight: 1.4 }}>
          Open WhatsApp on your phone &gt; Linked devices &gt; Link with phone number instead.
        </p>

        <a 
          href="#qr-login" 
          className="auth-phone-switch-link"
          onClick={(e) => {
            e.preventDefault();
            if (onSwitchToQR) onSwitchToQR();
          }}
        >
          <ChevronLeft size={16} />
          <span>Log in with QR code</span>
        </a>
      </div>
    </article>
  );
};

export default PhoneLoginCard;
