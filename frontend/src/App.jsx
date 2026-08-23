import React, { useState } from 'react';
import Navbar from './features/components/UI/Navbar';
import Home from './features/components/UI/Home';
import Footer from './features/components/UI/Footer';
import LoginPage from './features/auth/LoginPage';
import { 
  INITIAL_CHATS, 
  INITIAL_MESSAGES, 
  INITIAL_STATUS_UPDATES, 
  INITIAL_CHANNELS, 
  INITIAL_CALLS 
} from './features/data/dummyData';
import './App.css';
import './features/components/style/components.css';

const App = () => {
  const [currentView, setCurrentView] = useState('login'); // 'login' | 'chat'
  const [activeTab, setActiveTab] = useState('chats');
  const [searchQuery, setSearchQuery] = useState('');
  const [chats, setChats] = useState(INITIAL_CHATS);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [activeChatId, setActiveChatId] = useState('2'); // Default to '@bagchi10 (You)' as in reference
  // Calculate total unread count across all chats
  const totalUnread = chats.reduce((acc, chat) => acc + (chat.unread || 0), 0);

  // Send message handler
  const handleSendMessage = (text) => {
    if (!text.trim()) return;

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${hours}:${minutes}`;

    const newMessage = {
      id: `msg-${Date.now()}`,
      type: 'text',
      sender: 'me',
      text: text,
      time: currentTime,
      status: 'read'
    };

    // Update messages for current active chat
    setMessages((prev) => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] || []), newMessage]
    }));

    // Update chat list last message, time, and bring to top
    setChats((prevChats) => {
      const updated = prevChats.map((chat) => {
        if (chat.id === activeChatId) {
          return {
            ...chat,
            lastMessage: text,
            time: currentTime
          };
        }
        return chat;
      });

      // Move active chat to top
      const currentChatIndex = updated.findIndex((c) => c.id === activeChatId);
      if (currentChatIndex > -1) {
        const [currentChat] = updated.splice(currentChatIndex, 1);
        return [currentChat, ...updated];
      }
      return updated;
    });
  };

  const handleNewChat = () => {
    setActiveTab('chats');
    setSearchQuery('');
  };

  if (currentView === 'login') {
    return (
      <LoginPage onLoginSuccess={() => setCurrentView('chat')} />
    );
  }

  return (
    <div className="wa-app">
      {/* Top Navbar */}
      <Navbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        totalUnread={totalUnread}
        onNewChat={handleNewChat}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={() => setCurrentView('login')}
      />

      {/* Main Home / Body Canvas */}
      <Home
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        chats={chats}
        setChats={setChats}
        activeChatId={activeChatId}
        setActiveChatId={setActiveChatId}
        messages={messages}
        onSendMessage={handleSendMessage}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusUpdates={INITIAL_STATUS_UPDATES}
        channels={INITIAL_CHANNELS}
        callLogs={INITIAL_CALLS}
      />

      {/* Bottom Footer with 4 options: Chats, Status, Updates, Calls */}
      <Footer
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalUnread={totalUnread}
        missedCalls={2}
      />
    </div>
  );
};

export default App;
