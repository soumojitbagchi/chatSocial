import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  MoreVertical, 
  Phone, 
  Video, 
  Paperclip, 
  Smile, 
  Mic, 
  Send, 
  CheckCheck, 
  Lock, 
  FileText, 
  Download, 
  Image as ImageIcon, 
  Camera, 
  User, 
  BarChart2, 
  ArrowLeft,
  PhoneCall
} from 'lucide-react';
import '../style/components.css';

const Chat = ({ activeChat, messages, onSendMessage, onBack }) => {
  const [inputText, setInputText] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const messagesEndRef = useRef(null);
  const attachRef = useRef(null);

  // Auto scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChat]);

  // Close attach menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (attachRef.current && !attachRef.current.contains(e.target)) {
        setShowAttachMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSend = (e) => {
    e?.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!activeChat) {
    return (
      <div className="wa-conversation" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="wa-chat-wallpaper" />
        <div style={{ textAlign: 'center', zIndex: 1, padding: '2rem' }}>
          <div className="wa-brand-icon" style={{ width: 64, height: 64, margin: '0 auto 1.5rem auto' }}>
            <svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor">
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM17.56 16.68C17.33 17.33 16.42 17.88 15.65 18.05C15.12 18.16 14.44 18.25 12.13 17.29C9.17 16.07 7.27 13.06 7.12 12.86C6.98 12.67 5.92 11.26 5.92 9.8C5.92 8.34 6.66 7.63 6.95 7.33C7.2 7.07 7.56 6.96 7.92 6.96C8.04 6.96 8.16 6.97 8.26 6.97C8.56 6.98 8.71 7.01 8.91 7.48C9.16 8.08 9.77 9.56 9.84 9.71C9.92 9.87 9.99 10.07 9.88 10.28C9.78 10.5 9.69 10.6 9.54 10.77C9.39 10.95 9.25 11.08 9.09 11.27C8.92 11.45 8.74 11.65 8.95 12.01C9.15 12.36 9.85 13.51 10.88 14.43C12.21 15.62 13.3 16.01 13.69 16.17C14 16.3 14.19 16.27 14.37 16.07C14.59 15.81 15.3 14.98 15.54 14.64C15.77 14.3 16.01 14.35 16.32 14.47C16.64 14.59 18.34 15.43 18.69 15.61C19.04 15.78 19.27 15.86 19.35 16C19.43 16.14 19.43 16.8 19.19 17.45L17.56 16.68Z" />
            </svg>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--wa-text-primary)', marginBottom: '0.5rem' }}>
            WhatsApp Web
          </h2>
          <p style={{ color: 'var(--wa-text-secondary)', maxWidth: 420, fontSize: '0.9rem', lineHeight: 1.5 }}>
            Send and receive messages without keeping your phone online. Use WhatsApp on up to 4 linked devices and 1 phone at the same time.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginTop: '2rem', color: 'var(--wa-text-muted)', fontSize: '0.8rem' }}>
            <Lock size={13} />
            <span>End-to-end encrypted</span>
          </div>
        </div>
      </div>
    );
  }

  const chatMessages = messages[activeChat.id] || [];

  return (
    <div className="wa-conversation">
      {/* Background wallpaper */}
      <div className="wa-chat-wallpaper" />

      {/* Header */}
      <div className="wa-chat-header">
        <div className="wa-chat-header-user">
          {onBack && (
            <button 
              className="wa-nav-icon-btn" 
              onClick={onBack}
              style={{ marginRight: -4 }}
              title="Back"
            >
              <ArrowLeft size={20} />
            </button>
          )}

          <div className="wa-avatar-wrapper" style={{ width: 40, height: 40 }}>
            {activeChat.avatar ? (
              <img src={activeChat.avatar} alt={activeChat.name} className="wa-avatar-img" />
            ) : (
              <div 
                className="wa-avatar-fallback" 
                style={{ backgroundColor: activeChat.avatarBg || 'var(--wa-green-primary)' }}
              >
                {activeChat.initials || activeChat.name.charAt(0)}
              </div>
            )}
          </div>

          <div>
            <div className="wa-chat-header-name">
              {activeChat.name}
            </div>
            <div className="wa-chat-header-status">
              {activeChat.isMe ? 'Message yourself' : (activeChat.status || (activeChat.isGroup ? activeChat.groupMembers : 'online'))}
            </div>
          </div>
        </div>

        <div className="wa-chat-header-actions">
          <button className="wa-nav-icon-btn" title="Video call">
            <Video size={19} />
          </button>
          <button className="wa-nav-icon-btn" title="Voice call">
            <Phone size={18} />
          </button>
          <button className="wa-nav-icon-btn" title="Search in chat">
            <Search size={19} />
          </button>
          <button className="wa-nav-icon-btn" title="Menu">
            <MoreVertical size={19} />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="wa-messages-area">
        {/* Helper encryption notice if empty */}
        {chatMessages.length === 0 && (
          <div className="wa-encryption-banner">
            <Lock size={13} style={{ flexShrink: 0 }} />
            <span>Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.</span>
          </div>
        )}

        {chatMessages.map((msg) => {
          if (msg.type === 'date') {
            return (
              <div key={msg.id} className="wa-date-pill-wrapper">
                <div className="wa-date-pill">{msg.text}</div>
              </div>
            );
          }

          if (msg.type === 'system-security') {
            return (
              <div key={msg.id} className="wa-encryption-banner">
                <Lock size={13} style={{ flexShrink: 0 }} />
                <span>{msg.text}</span>
              </div>
            );
          }

          if (msg.type === 'call-log') {
            return (
              <div key={msg.id} className="wa-msg-row received">
                <div className="wa-msg-bubble" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(0, 168, 132, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--wa-green-bright)' }}>
                    <PhoneCall size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{msg.callType}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--wa-text-secondary)' }}>{msg.duration}</div>
                  </div>
                  <span className="wa-msg-meta" style={{ alignSelf: 'flex-end', marginLeft: 'auto' }}>
                    {msg.time}
                  </span>
                </div>
              </div>
            );
          }

          const isMe = msg.sender === 'me';

          return (
            <div key={msg.id} className={`wa-msg-row ${isMe ? 'sent' : 'received'}`}>
              <div className="wa-msg-bubble">
                {/* Group sender name if received in group */}
                {!isMe && msg.senderName && (
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--wa-green-bright)', marginBottom: '0.2rem' }}>
                    ~{msg.senderName}
                  </div>
                )}

                {/* Document Type Message */}
                {msg.type === 'document' && (
                  <div className="wa-document-card">
                    <div className="wa-doc-icon-box">
                      <FileText size={20} />
                    </div>
                    <div className="wa-doc-info">
                      <div className="wa-doc-name">{msg.fileName}</div>
                      <div className="wa-doc-sub">{msg.fileType} • {msg.fileSize}</div>
                    </div>
                    <button className="wa-nav-icon-btn" style={{ width: 32, height: 32 }} title="Download">
                      <Download size={16} />
                    </button>
                  </div>
                )}
                {/* Photo / Single Image Type Message */}
                {(msg.type === 'photo' || msg.type === 'image' || msg.imageUrl) && (
                  <div className="wa-msg-photo-container">
                    <img 
                      src={msg.imageUrl || msg.photoUrl || '/whatsapp-wallpaper.jpg'} 
                      alt={msg.caption || 'Photo'} 
                      className="wa-msg-photo" 
                    />
                    {msg.caption && (
                      <span className="wa-msg-caption">{msg.caption}</span>
                    )}
                  </div>
                )}


                {/* Gallery / Images Type Message */}
                {msg.type === 'gallery' && (
                  <div className="wa-image-grid">
                    {msg.images.map((img, idx) => (
                      <div 
                        key={idx} 
                        className="wa-gallery-card" 
                        style={{ gridColumn: idx === 0 ? 'span 2' : 'span 1' }}
                      >
                        <div>
                          <div className="wa-gallery-title">{img.title}</div>
                          <div className="wa-gallery-subtitle">{img.subtitle}</div>
                        </div>
                        <span className="wa-gallery-tag">{img.tag}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Text Message */}
                {msg.text && (
                  <span>{msg.text}</span>
                )}

                {/* Meta info: Time and Checkmarks */}
                <span className="wa-msg-meta">
                  <span>{msg.time}</span>
                  {isMe && (
                    <CheckCheck size={14} color="var(--wa-blue-tick)" />
                  )}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Attach Popover */}
      {showAttachMenu && (
        <div className="wa-attach-popover" ref={attachRef}>
          <button className="wa-attach-item" onClick={() => setShowAttachMenu(false)}>
            <div className="wa-attach-icon" style={{ backgroundColor: '#7f66ff' }}>
              <FileText size={16} />
            </div>
            <span>Document</span>
          </button>
          <button className="wa-attach-item" onClick={() => setShowAttachMenu(false)}>
            <div className="wa-attach-icon" style={{ backgroundColor: '#007bfc' }}>
              <ImageIcon size={16} />
            </div>
            <span>Photos & videos</span>
          </button>
          <button className="wa-attach-item" onClick={() => setShowAttachMenu(false)}>
            <div className="wa-attach-icon" style={{ backgroundColor: '#ff2e74' }}>
              <Camera size={16} />
            </div>
            <span>Camera</span>
          </button>
          <button className="wa-attach-item" onClick={() => setShowAttachMenu(false)}>
            <div className="wa-attach-icon" style={{ backgroundColor: '#009de2' }}>
              <User size={16} />
            </div>
            <span>Contact</span>
          </button>
          <button className="wa-attach-item" onClick={() => setShowAttachMenu(false)}>
            <div className="wa-attach-icon" style={{ backgroundColor: '#ffbc38' }}>
              <BarChart2 size={16} />
            </div>
            <span>Poll</span>
          </button>
        </div>
      )}

      {/* Composer Footer */}
      <form className="wa-composer" onSubmit={handleSend}>
        <button 
          type="button" 
          className={`wa-nav-icon-btn ${showAttachMenu ? 'active' : ''}`}
          onClick={() => setShowAttachMenu(!showAttachMenu)}
          title="Attach"
        >
          <Paperclip size={20} />
        </button>

        <button 
          type="button" 
          className="wa-nav-icon-btn" 
          title="Emojis"
          onClick={() => setInputText((prev) => prev + ' 😊 ')}
        >
          <Smile size={20} />
        </button>

        <div className="wa-composer-input-box">
          <input
            type="text"
            className="wa-composer-input"
            placeholder="Type a message"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {inputText.trim() ? (
          <button type="submit" className="wa-send-btn" title="Send message">
            <Send size={18} />
          </button>
        ) : (
          <button 
            type="button" 
            className="wa-nav-icon-btn" 
            title="Voice message"
            onClick={() => {
              onSendMessage('🎙️ Voice message (0:08)');
            }}
          >
            <Mic size={20} />
          </button>
        )}
      </form>
    </div>
  );
};

export default Chat;
