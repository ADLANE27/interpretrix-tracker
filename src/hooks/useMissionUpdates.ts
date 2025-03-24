
import { useEffect } from 'react';
import { useRealtimeSubscription } from './use-realtime-subscription';
import { eventEmitter, EVENT_INTERPRETER_STATUS_UPDATED } from '@/lib/events';
import { resetCircuitBreaker } from '@/hooks/use-realtime-subscription';

export const useMissionUpdates = (onUpdate: () => void) => {
  // Reset the circuit breaker when the hook is mounted
  useEffect(() => {
    try {
      resetCircuitBreaker();
      console.log('[useMissionUpdates] Reset circuit breaker for realtime subscriptions');
    } catch (error) {
      console.error('[useMissionUpdates] Error resetting circuit breaker:', error);
    }
  }, []);

  // Setup visibility change event listeners
  useEffect(() => {
    console.log('[useMissionUpdates] Setting up visibility change event listeners');
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[useMissionUpdates] App became visible, triggering update');
        onUpdate();
        
        // Also reset circuit breaker when app becomes visible
        try {
          resetCircuitBreaker();
          console.log('[useMissionUpdates] Reset circuit breaker on visibility change');
        } catch (error) {
          console.error('[useMissionUpdates] Error resetting circuit breaker:', error);
        }
      }
    };

    const handleOnline = () => {
      console.log('[useMissionUpdates] App is online, triggering update');
      onUpdate();
      
      // Reset circuit breaker when coming back online
      try {
        resetCircuitBreaker();
        console.log('[useMissionUpdates] Reset circuit breaker on online event');
      } catch (error) {
        console.error('[useMissionUpdates] Error resetting circuit breaker:', error);
      }
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
      maxRetries: 3,
      retryInterval: 5000,
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
      
      // Emit the status update event
      if (payload.new && payload.old && payload.new.status !== payload.old.status) {
        eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATED, {
          interpreterId: payload.new.id,
          status: payload.new.status,
          previousStatus: payload.old.status
        });
      }
      
      // Trigger the refresh
      onUpdate();
    },
    {
      maxRetries: 3,
      retryInterval: 3000, // Shorter retry for status updates
      onError: (error) => {
        console.error('[useMissionUpdates] Status subscription error:', error);
      }
    }
  );
};
