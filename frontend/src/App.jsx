import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router';
import Home from './features/components/UI/Home';
import LandingPage from './features/landing/UI/LandingPage';
import SignIn from './features/auth/UI/SignIn';
import SignUp from './features/auth/UI/SignUp';
import './App.css';
import './features/components/style/components.css';

const App = () => {
  const navigate = useNavigate();

  return (
    <Routes>
      {/* Landing Page */}
      <Route path="/" element={<LandingPage />} />

      {/* Auth Routes */}
      <Route path="/signin" element={<SignIn />} />
      <Route path="/login" element={<Navigate to="/signin" replace />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/register" element={<Navigate to="/signup" replace />} />

      {/* Main Chat Application */}
      <Route path="/chat" element={<Home onLogout={() => navigate('/')} />} />
      <Route path="/home" element={<Navigate to="/chat" replace />} />

      {/* Fallback Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
