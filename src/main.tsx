
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Create a promise to track OneSignal initialization
declare global {
  interface Window {
    oneSignalInitPromise?: Promise<void>;
    resolveOneSignal?: () => void;
    rejectOneSignal?: (error: any) => void;
    oneSignalInitialized?: boolean;
    _oneSignalInitialized?: boolean; // Add flag for initialization status
  }
}

// Mark OneSignal as initialized
window._oneSignalInitialized = true;
window.oneSignalInitialized = true;

// Create a resolved promise for initialization
window.oneSignalInitPromise = Promise.resolve();

// Create root element once
const root = createRoot(document.getElementById("root")!);

// Initialize OneSignal and render app
const startApp = async () => {
  try {
    // No need to wait for initialization anymore
    root.render(<App />);
  } catch (error) {
    console.error('[OneSignal] Setup error:', error);
    root.render(<App />);
  }
};

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
