
import { useEffect, useRef } from 'react';
import { useRealtimeSubscription } from './use-realtime-subscription';
import { supabase } from '@/integrations/supabase/client';

export const useMissionUpdates = (onUpdate: () => void) => {
  const updatedRef = useRef(false);
  const lastUpdateTimeRef = useRef(Date.now());
  
  // Avoid update floods - wait at least 2 seconds between updates
  const throttledUpdate = () => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
    
    if (timeSinceLastUpdate < 2000) {
      if (!updatedRef.current) {
        updatedRef.current = true;
        setTimeout(() => {
          updatedRef.current = false;
          lastUpdateTimeRef.current = Date.now();
          onUpdate();
        }, 2000 - timeSinceLastUpdate);
      }
    } else {
      lastUpdateTimeRef.current = now;
      onUpdate();
    }
  };
  
  // Setup visibility change event listeners
  useEffect(() => {
    console.log('[useMissionUpdates] Setting up visibility change event listeners');
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[useMissionUpdates] App became visible, triggering update');
        throttledUpdate();
      }
    };

    const handleOnlineStatus = () => {
      if (navigator.onLine) {
        console.log('[useMissionUpdates] App came online, triggering update');
        throttledUpdate();
      }
    };

    window.addEventListener("online", handleOnlineStatus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      console.log('[useMissionUpdates] Cleaning up event listeners');
      window.removeEventListener("online", handleOnlineStatus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Listen for local status update events
  useEffect(() => {
    const handleLocalStatusUpdate = () => {
      console.log('[useMissionUpdates] Detected local status update, triggering update');
      throttledUpdate();
    };
    
    window.addEventListener('local-interpreter-status-update', handleLocalStatusUpdate);
    
    return () => {
      window.removeEventListener('local-interpreter-status-update', handleLocalStatusUpdate);
    };
  }, []);

  // Subscribe to mission changes
  useRealtimeSubscription(
    {
      event: '*',
      schema: 'public',
      table: 'interpretation_missions'
    },
    (payload) => {
      console.log('[useMissionUpdates] Mission update received:', payload);
      throttledUpdate();
    },
    {
      debugMode: true,
      maxRetries: 3,
      retryInterval: 2000
    }
  );

  // Subscribe to reservation changes
  useRealtimeSubscription(
    {
      event: '*',
      schema: 'public',
      table: 'private_reservations'
    },
    (payload) => {
      console.log('[useMissionUpdates] Private reservation update received:', payload);
      throttledUpdate();
    },
    {
      debugMode: true,
      maxRetries: 3,
      retryInterval: 2000
    }
  );
  
  // Subscribe to interpreter profile status changes with correct filter
  useRealtimeSubscription(
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'interpreter_profiles',
      filter: 'status=eq.available,status=eq.busy,status=eq.pause,status=eq.unavailable'
    },
    (payload) => {
      console.log('[useMissionUpdates] Interpreter status update received:', payload);
      throttledUpdate();
      
      // Dispatch an event that other components can listen to
      const statusUpdateEvent = new CustomEvent('interpreter-status-update', { detail: payload });
      window.dispatchEvent(statusUpdateEvent);
    },
    {
      debugMode: true,
      maxRetries: 3,
      retryInterval: 2000
    }
  );
};
