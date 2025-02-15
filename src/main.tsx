
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('[ServiceWorker] Registration successful with scope:', registration.scope);
      })
      .catch(error => {
        console.error('[ServiceWorker] Registration failed:', error);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
