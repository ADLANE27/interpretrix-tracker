
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Create root element once
const root = createRoot(document.getElementById("root")!);

// Initialize app
const startApp = () => {
  root.render(<App />);
};

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
