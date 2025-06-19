import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import Dashboard from './components/Dashboard/Dashboard';
import AuthForm from './components/Auth/AuthForm';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import PWAInstallPrompt from './components/PWA/PWAInstallPrompt';
import PWAUpdatePrompt from './components/PWA/PWAUpdatePrompt';
import OfflineIndicator from './components/PWA/OfflineIndicator';
import NotificationSystem from './components/UI/NotificationSystem';
import { useNotifications } from './hooks/useNotifications';

function AppContent() {
  const {
    notifications,
    confirmations,
    removeNotification,
    removeConfirmation,
  } = useNotifications();

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {/* PWA Components */}
        <PWAUpdatePrompt />
        <OfflineIndicator />
        
        <Routes>
          <Route path="/auth" element={<AuthForm />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
        
        {/* PWA Install Prompt - only show when authenticated */}
        <ProtectedRoute>
          <PWAInstallPrompt />
        </ProtectedRoute>

        {/* Notification System */}
        <NotificationSystem
          notifications={notifications}
          confirmations={confirmations}
          onRemoveNotification={removeNotification}
          onRemoveConfirmation={removeConfirmation}
        />
      </div>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;