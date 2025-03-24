
import { useEffect } from 'react';
import { useRealtimeSubscription } from './use-realtime-subscription';
import { debounce } from '@/lib/utils';

export const useMissionUpdates = (onUpdate: () => void) => {
  // Create a debounced version of the update callback to prevent too many updates
  const debouncedUpdate = debounce(() => {
    console.log('[useMissionUpdates] Executing debounced update callback');
    onUpdate();
  }, 1000); // Debounce updates by 1 second

  // Setup visibility change event listeners
  useEffect(() => {
    console.log('[useMissionUpdates] Setting up visibility change event listeners');
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[useMissionUpdates] App became visible, triggering update');
        debouncedUpdate();
      }
    };

    const handleConnectionChange = () => {
      if (navigator.onLine) {
        console.log('[useMissionUpdates] Connection restored, triggering update');
        // Add a small delay to ensure connection is fully established
        setTimeout(debouncedUpdate, 2000);
      }
    };

    // Custom event listener for interpreter status updates
    const handleStatusUpdate = () => {
      console.log('[useMissionUpdates] Interpreter status update event received, triggering update');
      debouncedUpdate();
    };

    window.addEventListener("online", handleConnectionChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('interpreter-status-update', handleStatusUpdate);

    return () => {
      console.log('[useMissionUpdates] Cleaning up event listeners');
      window.removeEventListener("online", handleConnectionChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('interpreter-status-update', handleStatusUpdate);
    };
  }, [debouncedUpdate]);

  // Subscribe to mission changes
  useRealtimeSubscription(
    {
      event: '*',
      schema: 'public',
      table: 'interpretation_missions'
    },
    (payload) => {
      console.log('[useMissionUpdates] Mission update received:', payload);
      debouncedUpdate();
    },
    {
      debugMode: true, // Enable debug mode to see more logs
      maxRetries: 5,  // Increase max retries for better reliability
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
      debouncedUpdate();
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
  useRealtimeSubscription(
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'interpreter_profiles',
      filter: 'status=eq.available,status=eq.busy,status=eq.pause,status=eq.unavailable'
    },
    (payload) => {
      console.log('[useMissionUpdates] Interpreter status update received:', payload);
      
      // Dispatch a custom event to notify other components about the status change
      window.dispatchEvent(new CustomEvent('interpreter-status-update', { 
        detail: { 
          interpreterId: payload.new?.id,
          status: payload.new?.status 
        }
      }));
      
      // This is a status update, trigger the refresh
      debouncedUpdate();
    },
    {
      debugMode: true, // Enable debug mode for troubleshooting
      maxRetries: 5,
      retryInterval: 2000, // Shorter retry for status updates
      onError: (error) => {
        console.error('[useMissionUpdates] Status subscription error:', error);
      }
    }
  );
};
