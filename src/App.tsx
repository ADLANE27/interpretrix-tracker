
import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import { InterpreterDashboard } from "./components/InterpreterDashboard";
import InterpreterLogin from "./pages/InterpreterLogin";
import { AdminDashboard } from "./components/admin/AdminDashboard";
import AdminLogin from "./pages/AdminLogin";
import NotFound from "./pages/NotFound";
import { Toaster } from "./components/ui/toaster";
import "./App.css";

const ONESIGNAL_APP_ID = "2f15c47a-f369-4206-b077-eaddd8075b04";

const App = () => {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Initialize OneSignal array if it doesn't exist
      if (!window.OneSignal) {
        const oneSignalDeferred: ((OneSignal: Window['OneSignal']) => void)[] = [];
        Object.defineProperty(window, 'OneSignal', {
          get: () => oneSignalDeferred,
          set: (value) => {
            if (!Array.isArray(value)) {
              Object.defineProperty(window, 'OneSignal', { value });
              oneSignalDeferred.forEach(fn => fn(value));
            }
          },
        });
      }
      
      const initOneSignal = () => {
        if (!window.OneSignal?.init) {
          console.error('[OneSignal] OneSignal.init is not available');
          return;
        }

        window.OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          allowLocalhostAsSecureOrigin: true,
          serviceWorkerParam: { scope: '/push/onesignal/' },
          serviceWorkerPath: '/push/onesignal/OneSignalSDKWorker.js',
          promptOptions: {
            slidedown: {
              prompts: [
                {
                  type: "push",
                  autoPrompt: false,
                  text: {
                    actionMessage: "Voulez-vous recevoir des notifications pour les nouvelles missions ?",
                    acceptButton: "Autoriser",
                    cancelButton: "Plus tard"
                  },
                  delay: {
                    pageViews: 1,
                    timeDelay: 0
                  }
                }
              ]
            }
          }
        }).catch(error => {
          console.error('[OneSignal] Initialization error:', error);
        });
      };

      // If OneSignal is already properly initialized, don't reinitialize
      if (typeof window.OneSignal === 'object' && !Array.isArray(window.OneSignal) && window.OneSignal.init) {
        console.log('[OneSignal] Already initialized');
        return;
      }

      // If OneSignal is an array, push the initialization function
      if (Array.isArray(window.OneSignal)) {
        window.OneSignal.push(function(oneSignal) {
          if (!oneSignal.init) {
            console.error('[OneSignal] OneSignal.init is not available after push');
            return;
          }
          initOneSignal();
        });
      } else {
        // If OneSignal is already available but not initialized, initialize it
        initOneSignal();
      }
    }
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/interpreter/dashboard" element={<InterpreterDashboard />} />
        <Route path="/interpreter/login" element={<InterpreterLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </Router>
  );
};

export default App;
