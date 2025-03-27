
import { useEffect } from 'react';
import { addTableEventListener } from '@/lib/realtimeManager';
import { useRealtimeSubscription } from './useRealtimeSubscription2';
import { eventEmitter, EVENT_INTERPRETER_STATUS_UPDATE } from '@/lib/events';

export const useMissionUpdates = (onUpdate: () => void) => {
  // Setup visibility change event listeners
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[useMissionUpdates] App became visible, triggering update');
        onUpdate();
      }
    };

    window.addEventListener("online", handleVisibilityChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Listen for interpreter status update events
    const handleStatusUpdate = () => {
      console.log('[useMissionUpdates] Received manual status update event');
      onUpdate();
    };
    eventEmitter.on(EVENT_INTERPRETER_STATUS_UPDATE, handleStatusUpdate);

    return () => {
      window.removeEventListener("online", handleVisibilityChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      eventEmitter.off(EVENT_INTERPRETER_STATUS_UPDATE, handleStatusUpdate);
    };
  }, [onUpdate]);

  // Common options for all subscriptions
  const subscriptionOptions = {
    debounceTime: 500, // Debounce multiple events occurring close together
  };

  // Subscribe to mission changes
  useRealtimeSubscription(
    {
      event: '*',
      table: 'interpretation_missions'
    },
    () => {
      console.log('[useMissionUpdates] Mission update received');
      onUpdate();
    },
    subscriptionOptions
  );

  // Subscribe to reservation changes
  useRealtimeSubscription(
    {
      event: '*',
      table: 'private_reservations'
    },
    () => {
      console.log('[useMissionUpdates] Private reservation update received');
      onUpdate();
    },
    subscriptionOptions
  );
  
  // Use a more specific subscription for interpreter profile status changes
  useRealtimeSubscription(
    {
      event: 'UPDATE',
      table: 'interpreter_profiles',
      filter: 'status=eq.available,status=eq.busy,status=eq.pause,status=eq.unavailable'
    },
    () => {
      console.log('[useMissionUpdates] Interpreter status update received');
      onUpdate();
    },
    subscriptionOptions
  );
};
