/* eslint-disable react-refresh/only-export-components */
import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

const clearLocalAppData = () => {
  try {
    localStorage.removeItem('bs3-workspace');
    localStorage.removeItem('bs3-lang');
  } catch {
    // Ignore storage errors.
  }
};

const RecoveryPanel = ({ title, message, detail }) => (
  <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'linear-gradient(180deg, #E0F2FE 0%, #EFF6FF 100%)', padding: 16 }}>
    <div style={{ maxWidth: 560, width: '100%', background: '#fff', border: '1px solid #bae6fd', borderRadius: 20, padding: 20, boxShadow: '0 12px 26px rgba(2, 132, 199, 0.12)' }}>
      <h1 style={{ margin: 0, fontSize: 22, color: '#0a1628' }}>{title}</h1>
      <p style={{ marginTop: 10, fontSize: 14, color: '#475569' }}>{message}</p>
      <pre style={{ marginTop: 12, padding: 12, borderRadius: 12, background: '#f8fafc', color: '#334155', fontSize: 12, overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
        {detail}
      </pre>
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button type="button" onClick={() => window.location.reload()} style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' }}>
          Reload
        </button>
        <button
          type="button"
          onClick={() => {
            clearLocalAppData();
            window.location.reload();
          }}
          style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #0ea5e9', background: '#e0f2fe', color: '#0369a1', cursor: 'pointer' }}
        >
          Reset local cache
        </button>
      </div>
    </div>
  </div>
);

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: String(error?.message || 'Unknown runtime error'),
    };
  }

  componentDidCatch(error, info) {
    console.error('Root runtime error:', error, info);
  }

  handleHardReset = () => {
    clearLocalAppData();
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <RecoveryPanel
        title="Application error"
        message="The app hit a runtime error. You can reload or reset local app data."
        detail={this.state.errorMessage}
      />
    );
  }
}

const registerOrCleanupServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) return;

  if (import.meta.env.DEV) {
    // Prevent stale SW/caches from serving old bundles during local debugging.
    const registrations = await navigator.serviceWorker.getRegistrations().catch(() => []);
    await Promise.all(registrations.map((registration) => registration.unregister().catch(() => false)));
    if ('caches' in window) {
      const cacheKeys = await caches.keys().catch(() => []);
      await Promise.all(cacheKeys.map((key) => caches.delete(key).catch(() => false)));
    }
    return;
  }

  navigator.serviceWorker.register('/sw.js').catch(() => {});
};

const mountApp = async () => {
  const container = document.getElementById('root');
  if (!container) {
    throw new Error('Root container #root not found');
  }

  const root = createRoot(container);
  const renderFatal = (error) => {
    const message = String(error?.message || error || 'Unknown startup error');
    root.render(
      <StrictMode>
        <RecoveryPanel
          title="Application failed to start"
          message="Startup crashed before React could mount. This usually means a module import/runtime issue."
          detail={message}
        />
      </StrictMode>,
    );
  };

  try {
    await registerOrCleanupServiceWorker();
    const appModule = await import('./App.jsx');
    const App = appModule?.default;
    if (!App) {
      throw new Error('App module loaded but default export is missing');
    }

    root.render(
      <StrictMode>
        <RootErrorBoundary>
          <App />
        </RootErrorBoundary>
      </StrictMode>,
    );
  } catch (error) {
    console.error('Startup runtime error:', error);
    renderFatal(error);
  }
};

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => {
    mountApp().catch((error) => {
      console.error('Mount failure:', error);
    });
  });
} else {
  mountApp().catch((error) => {
    console.error('Mount failure:', error);
  });
}
