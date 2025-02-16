
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Register service worker
const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      console.log('[SW] Registration successful, scope:', registration.scope);
      
      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;
      console.log('[SW] Service worker ready');
    } catch (error) {
      console.error('[SW] Registration failed:', error);
    }
  } else {
    console.log('[SW] Service workers are not supported');
  }
};

// Create root element once
const root = createRoot(document.getElementById("root")!);

// Initialize app
const startApp = async () => {
  // Register service worker before rendering the app
  await registerServiceWorker();
  root.render(<App />);
};

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
