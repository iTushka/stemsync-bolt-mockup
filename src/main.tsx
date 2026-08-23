import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { DemoAdminApp } from './DemoAdmin/DemoAdminApp.tsx';
import { DemoAgentGate } from './DemoAgent/DemoAgentGate.tsx';
import { LanguageProvider } from './LanguageContext.tsx';
import './index.css';

// No router library — same "decide entirely from window.location in JS"
// approach config.ts already uses for tenant detection. /demo-admin is
// gated separately (see functions/_middleware.js, DEMO_ADMIN_USER/PASS)
// and renders a completely different tree than the main seller app.
const isDemoAdmin = window.location.pathname.startsWith('/demo-admin');

// DemoAgentGate is a no-op for every pilot except the three sales-demo
// pilots (/demo-fashion|craft|food) — see DemoAgentGate.tsx.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isDemoAdmin ? (
      <DemoAdminApp />
    ) : (
      <LanguageProvider>
        <DemoAgentGate>
          <App />
        </DemoAgentGate>
      </LanguageProvider>
    )}
  </StrictMode>
);
