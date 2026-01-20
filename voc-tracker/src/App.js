import React from 'react';
import { MsalProvider, AuthenticatedTemplate, UnauthenticatedTemplate, useMsal } from '@azure/msal-react';
import { loginRequest } from './config/authConfig';
import VOCTracker from './components/VOCTracker';

// Login button component
function LoginButton() {
  const { instance } = useMsal();

  const handleLogin = () => {
    instance.loginPopup(loginRequest).catch(e => {
      console.error('Login failed:', e);
    });
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
        <div style={{
          width: '64px',
          height: '64px',
          background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        
        <h1 style={{
          fontSize: '24px',
          fontWeight: '700',
          color: '#0f172a',
          marginBottom: '8px',
        }}>
          <span style={{ color: '#f97316' }}>VOC</span> Emissions Tracker
        </h1>
        
        <p style={{
          fontSize: '14px',
          color: '#64748b',
          marginBottom: '32px',
        }}>
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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 21 21" fill="currentColor">
            <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
            <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
            <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
          </svg>
          Sign in with Microsoft
        </button>
        
        <p style={{
          fontSize: '12px',
          color: '#94a3b8',
          marginTop: '24px',
        }}>
          Sign in with your organizational account to access the VOC tracking system.
        </p>
      </div>
    </div>
  );
}

// Main app content wrapper
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

// Root App component - now receives msalInstance as prop
function App({ msalInstance }) {
  return (
    <MsalProvider instance={msalInstance}>
      <AppContent />
    </MsalProvider>
  );
}

export default App;
