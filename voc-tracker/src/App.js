import React, { useEffect, useState } from 'react';
import { MsalProvider, AuthenticatedTemplate, UnauthenticatedTemplate, useMsal } from '@azure/msal-react';
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig, loginRequest } from './config/authConfig';
import VOCTracker from './components/VOCTracker';

// Create MSAL instance OUTSIDE the component
const msalInstance = new PublicClientApplication(msalConfig);

// Login button component
function LoginButton() {
  const { instance } = useMsal();

  const handleLogin = async () => {
    try {
      await instance.loginPopup(loginRequest);
    } catch (e) {
      console.error('Login failed:', e);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '48px',
        textAlign: 'center',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        maxWidth: '400px',
      }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
          <span style={{ color: '#f97316' }}>VOC</span> Emissions Tracker
        </h1>
        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '32px' }}>
          Environmental Compliance Management System
        </p>
        <button
          onClick={handleLogin}
          style={{
            width: '100%',
            padding: '14px 24px',
            background: '#0f172a',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          Sign in with Microsoft
        </button>
      </div>
    </div>
  );
}

function AppContent() {
  return (
    <>
      <AuthenticatedTemplate>
        <VOCTracker />
      </AuthenticatedTemplate>
      <UnauthenticatedTemplate>
        <LoginButton />
      </UnauthenticatedTemplate>
    </>
  );
}

// Root App - wait for MSAL to initialize
function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    msalInstance.initialize().then(() => {
      setIsReady(true);
    });
  }, []);

  if (!isReady) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;
  }

  return (
    <MsalProvider instance={msalInstance}>
      <AppContent />
    </MsalProvider>
  );
}

export default App;
