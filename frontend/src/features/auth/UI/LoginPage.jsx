import React, { useState } from 'react';
import AuthNavbar from './UI/AuthNavbar';
import QRCodeCard from './QRCodeCard';
import PhoneLoginCard from './PhoneLoginCard';
import AuthFooter from './UI/AuthFooter';
import '../style/auth.css';

const LoginPage = ({ onLoginSuccess }) => {
  const [authMethod, setAuthMethod] = useState('qr'); // 'qr' | 'phone'

  return (
    <div className="auth-page">
      {/* Top Navbar with chatSocial Branding */}
      <AuthNavbar onOpenApp={onLoginSuccess} />

      {/* Main Card Canvas */}
      <main className="auth-main-container">
        {authMethod === 'qr' ? (
          <QRCodeCard 
            onSwitchToPhone={() => setAuthMethod('phone')} 
            onLoginSuccess={onLoginSuccess}
          />
        ) : (
          <PhoneLoginCard 
            onSwitchToQR={() => setAuthMethod('qr')} 
            onLoginSuccess={onLoginSuccess}
          />
        )}
      </main>

      {/* Bottom Footer */}
      <AuthFooter />
    </div>
  );
};

export default LoginPage;
