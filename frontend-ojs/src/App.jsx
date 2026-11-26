import React, { useState, useEffect } from 'react';
import Dashboard from './Dashboard';
import Login from './Login';

const GUEST_USER = {
  id: null,
  role: 'guest',
  label: 'Pengunjung Publik',
  name: 'Pengunjung Portal',
  email: '',
  affiliation: 'Akses Publik (Open Access)'
};

function App() {
  const [view, setView] = useState(() => {
    try {
      const savedUser = localStorage.getItem('ojs_brida_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed && parsed.role) return 'app';
      }
      return 'login';
    } catch {
      return 'login';
    }
  });

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('ojs_brida_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [initialTab, setInitialTab] = useState(() => {
    try {
      return localStorage.getItem('ojs_brida_tab') || 'portal';
    } catch {
      return 'portal';
    }
  });

  useEffect(() => {
    try {
      if (currentUser && view === 'app') {
        localStorage.setItem('ojs_brida_user', JSON.stringify(currentUser));
        localStorage.setItem('ojs_brida_tab', initialTab);
      } else {
        localStorage.removeItem('ojs_brida_user');
        localStorage.removeItem('ojs_brida_tab');
      }
    } catch {
      // ignore storage errors
    }
  }, [view, currentUser, initialTab]);

  const handleLogin = (userObj) => {
    setCurrentUser(userObj);
    setInitialTab(userObj.role === 'reviewer' ? 'review' : 'dashboard');
    setView('app');
  };

  const handleOpenPublicPortal = () => {
    setCurrentUser(GUEST_USER);
    setInitialTab('portal');
    setView('app');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setInitialTab('portal');
    setView('login');
    try {
      localStorage.removeItem('ojs_brida_user');
      localStorage.removeItem('ojs_brida_tab');
      localStorage.removeItem('ojs_brida_logged_in');
    } catch {
      // ignore
    }
  };

  return (
    <div className="App">
      {view === 'app' && currentUser ? (
        <Dashboard
          currentUser={currentUser}
          initialTab={initialTab}
          onLogout={handleLogout}
        />
      ) : (
        <Login
          onLogin={handleLogin}
          onOpenPublicPortal={handleOpenPublicPortal}
        />
      )}
    </div>
  );
}

export default App;
