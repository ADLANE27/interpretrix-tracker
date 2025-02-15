
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Wait for page load before initializing service worker
window.addEventListener('load', async () => {
  try {
    // First, unregister any existing service workers
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
      console.log('[ServiceWorker] Unregistered old service worker');
    }

    // Small delay to ensure cleanup is complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Then register the OneSignal service worker
    const registration = await navigator.serviceWorker.register('/OneSignalSDKWorker.js', {
      scope: '/'
    });
    console.log('[ServiceWorker] Registration successful with scope:', registration.scope);
  } catch (error) {
    console.error('[ServiceWorker] Registration failed:', error);
  }
});

createRoot(document.getElementById("root")!).render(<App />);
