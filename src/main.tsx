
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Create root element once
const root = createRoot(document.getElementById("root")!);

// Initialize app with OneSignal
const startApp = async () => {
  try {
    // Wait for OneSignal to initialize (promise defined in index.html)
    if (window.oneSignalInitPromise) {
      await window.oneSignalInitPromise;
      console.log('[OneSignal] Initialization completed');
    }
    
    // Render app regardless of OneSignal status
    root.render(<App />);
  } catch (error) {
    console.error('[OneSignal] Setup error:', error);
    // Still render app even if OneSignal fails
    root.render(<App />);
  }
};

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
