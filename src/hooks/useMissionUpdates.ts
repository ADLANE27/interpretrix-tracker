
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

    const handleOnline = () => {
      console.log('[useMissionUpdates] Network connection restored, triggering update');
      onUpdate();
    };

    window.addEventListener("online", handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      console.log('[useMissionUpdates] Cleaning up event listeners');
      window.removeEventListener("online", handleOnline);
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
      debugMode: true,
      maxRetries: 3,
      retryInterval: 5000,
      onError: (error) => {
        console.error('[useMissionUpdates] Subscription error:', error);
      }
    }
  );
  
  // Subscribe to ALL interpreter profile changes - don't use filters as they're unreliable
  useRealtimeSubscription(
    {
      event: '*',
      schema: 'public',
      table: 'interpreter_profiles'
    },
    (payload) => {
      console.log('[useMissionUpdates] Interpreter profile update received:', payload);
      if (payload.new && payload.old && payload.new.status !== payload.old.status) {
        console.log('[useMissionUpdates] Interpreter status changed from', payload.old.status, 'to', payload.new.status);
        onUpdate();
      } else {
        console.log('[useMissionUpdates] Not a status change, skipping update');
      }
    },
    {
      debugMode: true,
      maxRetries: 5,
      retryInterval: 3000,
      onError: (error) => {
        console.error('[useMissionUpdates] Status subscription error:', error);
      }
    }
  );
};
