import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ChevronRight, RotateCw, CheckCircle2 } from 'lucide-react';
import '../style/auth.css';

const QRCodeCard = ({ onSwitchToPhone, onLoginSuccess }) => {
  const [qrExpired, setQrExpired] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);

  // QR expiration countdown simulation
  useEffect(() => {
    if (timeLeft <= 0) {
      setQrExpired(true);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleReloadQR = (e) => {
    e?.stopPropagation();
    setQrExpired(false);
    setTimeLeft(60);
  };

  const handleSimulateScan = () => {
    if (qrExpired) {
      handleReloadQR();
      return;
    }
    setIsScanning(true);
    setTimeout(() => {
      if (onLoginSuccess) {
        onLoginSuccess();
      }
      setIsScanning(false);
    }, 1200);
  };

  return (
    <article className="auth-card" aria-label="QR Code Login Card">
      {/* Left Column: Instructions */}
      <div className="auth-card-left">
        <h2 className="auth-card-title">Scan to log in</h2>

        <div className="auth-steps-list">
          {/* Step 1 */}
          <div className="auth-step-item">
            <div className="auth-step-number">1</div>
            <div className="auth-step-text">
              Scan the QR code with your phone's camera
            </div>
          </div>

          {/* Step 2 */}
          <div className="auth-step-item">
            <div className="auth-step-number">2</div>
            <div className="auth-step-text">
              <span>Tap the link to open</span>
              
              <span className="auth-step-icon-badge" title="WhatsApp">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                </svg>
              </span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="auth-step-item">
            <div className="auth-step-number">3</div>
            <div className="auth-step-text">
              Scan the QR code again to link to your account
            </div>
          </div>
        </div>

        {/* Need Help Link */}
        <a 
          href="#help" 
          className="auth-action-link"
          onClick={(e) => {
            e.preventDefault();
            alert('To link your WhatsApp account, open WhatsApp on your phone > Settings > Linked Devices > Link a Device.');
          }}
        >
          <span>Need help?</span>
          <ArrowUpRight size={16} />
        </a>
      </div>

      {/* Right Column: QR Code */}
      <div className="auth-card-right">
        <div 
          className="auth-qr-frame" 
          onClick={handleSimulateScan}
          title="Click to simulate scan & login"
        >
          <img 
            src="/qr-code.png" 
            alt="WhatsApp Web Login QR Code" 
            className="auth-qr-image" 
          />

          {/* Expired Overlay */}
          {qrExpired && (
            <div className="auth-qr-overlay">
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--auth-text-primary)' }}>
                QR code expired
              </span>
              <button 
                type="button"
                className="auth-qr-reload-btn" 
                onClick={handleReloadQR}
              >
                <RotateCw size={15} />
                <span>Click to reload</span>
              </button>
            </div>
          )}

          {/* Scanning Animation Simulation */}
          {isScanning && (
            <div className="auth-qr-overlay">
              <CheckCircle2 size={36} color="var(--auth-green)" className="animate-pulse" />
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--auth-green)' }}>
                Connecting to chatSocial...
              </span>
            </div>
          )}
        </div>

        {/* Link to Phone Login */}
        <a 
          href="#phone-login" 
          className="auth-phone-switch-link"
          onClick={(e) => {
            e.preventDefault();
            if (onSwitchToPhone) onSwitchToPhone();
          }}
        >
          <span>Log in with phone number</span>
          <ChevronRight size={16} />
        </a>
      </div>
    </article>
  );
};

export default QRCodeCard;
