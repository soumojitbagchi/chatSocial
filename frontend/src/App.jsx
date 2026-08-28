import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router';
import { AuthProvider } from './features/auth/state/AuthContext';
import { useAuthContext } from './features/auth/hooks/useAuthContext';
import { ChatProvider } from './features/chat/state/ChatContext';
import Home from './features/chat/UI/Home';
import LandingPage from './features/landing/UI/LandingPage';
import SignIn from './features/auth/UI/SignIn';
import SignUp from './features/auth/UI/SignUp';
import { Loader } from './components/ui/loader';
import './App.css';
import './features/chat/style/components.css';

/**
 * ProtectedRoute: Requires valid authenticated session.
 * Unauthenticated users are redirected to /signin with replace.
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isVerifying } = useAuthContext();

  if (isVerifying) {
    return <Loader fullscreen text="Verifying authentication..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  return <ChatProvider>{children}</ChatProvider>;
};

/**
 * PublicOnlyRoute: For guest routes like /signin and /signup.
 * If user is already authenticated, redirects to /chat with replace.
 */
const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, isVerifying } = useAuthContext();

  if (isVerifying) {
    return <Loader fullscreen text="Loading..." />;
  }

  if (isAuthenticated) {
    return <Navigate to="/chat" replace />;
  }

  return children;
};

const AppRoutes = () => {
  const navigate = useNavigate();

  return (
    <Routes>
      {/* Landing Page */}
      <Route path="/" element={<LandingPage />} />

      {/* Guest Only Auth Routes */}
      <Route
        path="/signin"
        element={
          <PublicOnlyRoute>
            <SignIn />
          </PublicOnlyRoute>
        }
      />
      <Route path="/login" element={<Navigate to="/signin" replace />} />
      <Route
        path="/signup"
        element={
          <PublicOnlyRoute>
            <SignUp />
          </PublicOnlyRoute>
        }
      />
      <Route path="/register" element={<Navigate to="/signup" replace />} />

      {/* Main Chat Application (Protected) */}
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <Home onLogout={() => navigate('/signin', { replace: true })} />
          </ProtectedRoute>
        }
      />
      <Route path="/home" element={<Navigate to="/chat" replace />} />

      {/* Fallback Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
};

export default App;
