
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from '@/components/ui/toaster';
import App from '@/App';
import '@/index.css';
import { RealtimeProvider } from '@/context/RealtimeContext';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

export function AppWrapper() {
  return (
    <Router>
      <QueryClientProvider client={queryClient}>
        <RealtimeProvider>
          <App />
          <Toaster />
          <ReactQueryDevtools initialIsOpen={false} />
        </RealtimeProvider>
      </QueryClientProvider>
    </Router>
  );
}

export default AppWrapper;
