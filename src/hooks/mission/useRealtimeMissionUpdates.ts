
import { useRealtimeSubscription } from '../realtime/useRealtimeSubscription';

/**
 * Hook to handle realtime subscription for mission data updates
 */
export const useRealtimeMissionUpdates = (onUpdate: () => void) => {
  // Subscribe to mission changes
  useRealtimeSubscription(
    {
      event: '*',
      schema: 'public',
      table: 'interpretation_missions'
    },
    (payload) => {
      console.log('[useRealtimeMissionUpdates] Mission update received:', payload);
      onUpdate();
    },
    {
      debugMode: true,
      maxRetries: 5,
      retryInterval: 3000,
      onError: (error) => {
        console.error('[useRealtimeMissionUpdates] Subscription error:', error);
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
      console.log('[useRealtimeMissionUpdates] Private reservation update received:', payload);
      onUpdate();
    },
    {
      debugMode: true,
      maxRetries: 5,
      retryInterval: 3000,
      onError: (error) => {
        console.error('[useRealtimeMissionUpdates] Subscription error:', error);
      }
    }
  );
  
  // Use a more specific subscription for interpreter profile status changes
  useRealtimeSubscription(
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'interpreter_profiles',
      filter: `status=not.is.null` // Fixed filter syntax
    },
    (payload) => {
      if (!payload.new?.id || !payload.new?.status) return;
      
      console.log('[useRealtimeMissionUpdates] Interpreter status update received:', payload);
      
      // Dispatch a global event that other components can listen to
      window.dispatchEvent(new CustomEvent('interpreter-status-update', { 
        detail: { 
          interpreter_id: payload.new.id,
          status: payload.new.status,
          timestamp: Date.now()
        }
      }));
      
      // This is a status update, trigger the refresh 
      onUpdate();
    },
    {
      debugMode: true,
      maxRetries: 5,
      retryInterval: 2000, // Shorter retry for status updates
      onError: (error) => {
        console.error('[useRealtimeMissionUpdates] Status subscription error:', error);
      }
    }
  );
};
