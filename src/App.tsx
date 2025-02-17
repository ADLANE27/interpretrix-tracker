
import { BrowserRouter } from 'react-router-dom';
import { RealtimeProvider } from './contexts/RealtimeContext';
import { Toaster } from "@/components/ui/toaster";
import './App.css';
import { SiteRoutes } from './routes/Routes';

function App() {
  return (
    <BrowserRouter>
      <RealtimeProvider>
        <SiteRoutes />
        <Toaster />
      </RealtimeProvider>
    </BrowserRouter>
  );
}

export default App;
