import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import ProcessingView from './pages/ProcessingView';
import { getCurrentUser } from './services/api';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  const checkAuthStatus = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      setInitializing(false);
      return;
    }
    try {
      const userData = await getCurrentUser();
      setUser(userData);
    } catch (err) {
      console.error('Session verification failed:', err);
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setInitializing(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  if (initializing) {
    return (
      <div className="min-h-screen bg-[#09090e] text-white flex flex-col items-center justify-center space-y-3 font-mono text-xs">
        <Loader2 size={28} className="animate-spin text-indigo-500" />
        <span>Initializing AI Video Assistant...</span>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-[#09090e] text-white flex flex-col font-sans">
        <Navbar user={user} onLogout={() => setUser(null)} />

        <main className="flex-1">
          <Routes>
            <Route
              path="/"
              element={
                user ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <LandingPage onAuthSuccess={checkAuthStatus} />
                )
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute user={user}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat/:id"
              element={
                <ProtectedRoute user={user}>
                  <ProcessingView />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
