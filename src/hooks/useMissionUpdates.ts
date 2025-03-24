
import { useEffect } from 'react';
import { useRealtimeSubscription } from './use-realtime-subscription';

export const useMissionUpdates = (onUpdate: () => void) => {
  // Setup visibility change event listeners
  useEffect(() => {
    console.log('[useMissionUpdates] Setting up visibility change event listeners');
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[useMissionUpdates] App became visible, triggering update');
        onUpdate();
      }
    };

    const handleOnlineStatus = () => {
      if (navigator.onLine) {
        console.log('[useMissionUpdates] App came online, triggering update');
        onUpdate();
      }
    };

    window.addEventListener("online", handleOnlineStatus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      console.log('[useMissionUpdates] Cleaning up event listeners');
      window.removeEventListener("online", handleOnlineStatus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [onUpdate]);

  // Subscribe to mission changes
  useRealtimeSubscription(
    {
      event: '*',
      schema: 'public',
      table: 'interpretation_missions'
    },
    (payload) => {
      console.log('[useMissionUpdates] Mission update received:', payload);
      onUpdate();
    },
    {
      debugMode: true,
      maxRetries: 5,
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
      onUpdate();
    },
    {
      debugMode: true,
      maxRetries: 5,
      retryInterval: 2000
    }
  );
  
  // Subscribe to interpreter profile status changes - using the correct filter syntax
  useRealtimeSubscription(
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'interpreter_profiles',
      filter: 'status=in.(available,busy,pause,unavailable)'
    },
    (payload) => {
      console.log('[useMissionUpdates] Interpreter status update received:', payload);
      onUpdate();
      
      // Dispatch an event that other components can listen to
      const statusUpdateEvent = new CustomEvent('interpreter-status-update', { detail: payload });
      window.dispatchEvent(statusUpdateEvent);
    },
    {
      debugMode: true,
      maxRetries: 5,
      retryInterval: 2000
    }
  );
};
