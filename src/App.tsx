
import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { routes } from './routes';
import { ThemeProvider } from './components/providers/theme-provider';
import { Toaster } from "./components/ui/toaster";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useGlobalNotification } from './hooks/useGlobalNotification';
import { ConnectionStatusIndicator } from './components/ui/ConnectionStatusIndicator';

// Create a client
const queryClient = new QueryClient();

function App() {
  useGlobalNotification();
  
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <TooltipProvider>
          <RouterProvider router={createBrowserRouter(routes)} />
          <Toaster />
          <ConnectionStatusIndicator />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
