
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

    // Listen for status update events
    const handleStatusUpdate = () => {
      console.log('[useMissionUpdates] Status update event received, triggering refresh');
      onUpdate();
    };

    window.addEventListener("online", handleVisibilityChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('interpreter-status-update', handleStatusUpdate);

    return () => {
      console.log('[useMissionUpdates] Cleaning up event listeners');
      window.removeEventListener("online", handleVisibilityChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('interpreter-status-update', handleStatusUpdate);
    };
  }, [onUpdate]);

  // Subscribe to mission changes with improved filter
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
      retryInterval: 3000,
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
      maxRetries: 5,
      retryInterval: 3000,
      onError: (error) => {
        console.error('[useMissionUpdates] Subscription error:', error);
      }
    }
  );
  
  // Use a more specific subscription for interpreter profile status changes
  // Fixed: Use proper filter syntax for Supabase realtime
  useRealtimeSubscription(
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'interpreter_profiles'
    },
    (payload) => {
      console.log('[useMissionUpdates] Interpreter status update received:', payload);
      // This is a status update, trigger the refresh and dispatch an event
      onUpdate();
      
      // Dispatch a global event that other components can listen to
      if (payload.new?.id && payload.new?.status) {
        window.dispatchEvent(new CustomEvent('interpreter-status-update', { 
          detail: { 
            interpreter_id: payload.new.id,
            status: payload.new.status
          }
        }));
      }
    },
    {
      debugMode: true,
      maxRetries: 5,
      retryInterval: 2000, // Shorter retry for status updates
      onError: (error) => {
        console.error('[useMissionUpdates] Status subscription error:', error);
      }
    }
  );
};
