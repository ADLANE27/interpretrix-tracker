
import { useEffect, useCallback, useRef } from 'react';
import { useRealtimeSubscription } from './use-realtime-subscription';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/profile';

export const useMissionUpdates = (onUpdate: () => void) => {
  const lastUpdateTimeRef = useRef<number>(Date.now());
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const triggerUpdate = useCallback(() => {
    const now = Date.now();
    // Prevent excessive updates (debounce-like behavior)
    if (now - lastUpdateTimeRef.current > 1000) {
      lastUpdateTimeRef.current = now;
      onUpdate();
    }
  }, [onUpdate]);

  // Handle manual polling as a fallback mechanism
  const setupPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Poll every 30 seconds as a fallback
    pollingIntervalRef.current = setInterval(() => {
      console.log('[useMissionUpdates] Polling for updates');
      triggerUpdate();
    }, 30000); // 30 seconds polling interval
  }, [triggerUpdate]);

  // Setup visibility change event listeners
  useEffect(() => {
    console.log('[useMissionUpdates] Setting up visibility change event listeners');
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[useMissionUpdates] App became visible, triggering update');
        triggerUpdate();
      }
    };

    const handleOnline = () => {
      console.log('[useMissionUpdates] Network is online, triggering update');
      triggerUpdate();
    };

    window.addEventListener("online", handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Set up polling as a fallback
    setupPolling();

    return () => {
      console.log('[useMissionUpdates] Cleaning up event listeners and polling');
      window.removeEventListener("online", handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [triggerUpdate, setupPolling]);

  // Function to dispatch a targeted interpreter status update event
  const dispatchInterpreterStatusUpdate = useCallback((interpreterId: string, newStatus: Profile['status']) => {
    console.log(`[useMissionUpdates] Dispatching specific interpreter update: ${interpreterId} -> ${newStatus}`);
    window.dispatchEvent(
      new CustomEvent('specific-interpreter-status-update', {
        detail: { interpreterId, newStatus }
      })
    );
  }, []);

  // Subscribe to interpreter profile changes (for status updates)
  useRealtimeSubscription(
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'interpreter_profiles',
      filter: 'status=eq.available,status=eq.busy,status=eq.pause,status=eq.unavailable'
    },
    (payload) => {
      console.log('[useMissionUpdates] Interpreter status update received:', payload);
      
      if (payload.new && payload.old) {
        const newStatus = payload.new.status;
        const oldStatus = payload.old.status;
        const interpreterId = payload.new.id;
        
        if (newStatus !== oldStatus) {
          console.log(`[useMissionUpdates] Status changed from ${oldStatus} to ${newStatus} for interpreter ${interpreterId}`);
          
          // Dispatch targeted update for this specific interpreter
          dispatchInterpreterStatusUpdate(interpreterId, newStatus as Profile['status']);
          
          // Also trigger a general update
          triggerUpdate();
        }
      } else {
        // If payload doesn't contain the expected data, trigger a general update
        triggerUpdate();
      }
    },
    {
      debugMode: true,
      maxRetries: 5,
      retryInterval: 3000,
      onError: (error) => {
        console.error('[useMissionUpdates] Status subscription error:', error);
        // If subscription fails, rely on polling
        setupPolling();
      }
    }
  );

  // Subscribe to private reservation changes
  useRealtimeSubscription(
    {
      event: '*',
      schema: 'public',
      table: 'private_reservations'
    },
    (payload) => {
      console.log('[useMissionUpdates] Private reservation update received:', payload);
      triggerUpdate();
    },
    {
      debugMode: true,
      maxRetries: 3,
      retryInterval: 5000,
      onError: (error) => {
        console.error('[useMissionUpdates] Subscription error:', error);
      }
    }
  );
  
  // Subscribe to interpretation missions changes
  useRealtimeSubscription(
    {
      event: '*',
      schema: 'public',
      table: 'interpretation_missions'
    },
    (payload) => {
      console.log('[useMissionUpdates] Mission update received:', payload);
      triggerUpdate();
    },
    {
      debugMode: true,
      maxRetries: 3,
      retryInterval: 5000,
      onError: (error) => {
        console.error('[useMissionUpdates] Subscription error:', error);
      }
    }
  );
};
