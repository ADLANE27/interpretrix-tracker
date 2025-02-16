
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Create root element once
const root = createRoot(document.getElementById("root")!);

// Register service worker
const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      
      if (registration.installing) {
        console.log('Service worker installing');
      } else if (registration.waiting) {
        console.log('Service worker installed');
      } else if (registration.active) {
        console.log('Service worker active');
      }
      
    } catch (error) {
      console.error('Service worker registration failed:', error);
    }
  }
};

// Initialize app
const startApp = () => {
  root.render(<App />);
  registerServiceWorker();
};

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
