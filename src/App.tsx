
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
    // Initialize OneSignal
    if (typeof window !== 'undefined') {
      window.OneSignal = window.OneSignal || [];
      const OneSignal = window.OneSignal;
      
      if (OneSignal.init) return; // Already initialized
      
      OneSignal.push(() => {
        OneSignal.init({
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
        });
      });
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
