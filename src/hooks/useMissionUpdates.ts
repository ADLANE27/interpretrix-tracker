
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

    window.addEventListener("online", handleVisibilityChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      console.log('[useMissionUpdates] Cleaning up event listeners');
      window.removeEventListener("online", handleVisibilityChange);
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
      debugMode: false,
      maxRetries: 3,
      retryInterval: 5000,
      onError: (error) => {
        console.error('[useMissionUpdates] Subscription error:', error);
      }
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
      debugMode: false,
      maxRetries: 3,
      retryInterval: 5000,
      onError: (error) => {
        console.error('[useMissionUpdates] Subscription error:', error);
      }
    }
  );
  
  // Also subscribe to interpreter profile changes to get status updates
  useRealtimeSubscription(
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'interpreter_profiles'
    },
    (payload) => {
      console.log('[useMissionUpdates] Interpreter profile update received:', payload);
      onUpdate();
    },
    {
      debugMode: false,
      maxRetries: 3,
      retryInterval: 5000,
      onError: (error) => {
        console.error('[useMissionUpdates] Subscription error:', error);
      }
    }
  );
};
