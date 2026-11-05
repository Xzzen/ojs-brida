import React, { useState } from 'react';
import Dashboard from './Dashboard';
import Login from './Login';

const DEFAULT_USER = {
  role: 'admin',
  label: 'Chief Editor / Admin Portal',
  name: 'Dr. Ir. H. Andi Syahrul, M.Si.',
  email: 'admin@brida.go.id',
  affiliation: 'Kepala Dewan Redaksi — BRIDA Kota Makassar'
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [currentUser, setCurrentUser] = useState(DEFAULT_USER);
  const [initialTab, setInitialTab] = useState('portal');

  const handleLogin = (roleObj) => {
    setCurrentUser(roleObj || DEFAULT_USER);
    setInitialTab('dashboard');
    setIsLoggedIn(true);
  };

  const handleOpenPublicPortal = () => {
    setInitialTab('portal');
    setIsLoggedIn(true);
  };

  return (
    <div className="App">
      {isLoggedIn ? (
        <Dashboard
          currentUser={currentUser}
          onChangeRole={(newRole) => setCurrentUser(newRole)}
          initialTab={initialTab}
          onLogout={() => setIsLoggedIn(false)}
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
