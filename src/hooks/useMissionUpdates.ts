
import { useEffect } from 'react';
import { useRealtimeSubscription } from './use-realtime-subscription';
import { eventEmitter, EVENT_INTERPRETER_STATUS_UPDATE } from '@/lib/events';

// Determine if we're in production mode
const isProduction = () => {
  return window.location.hostname !== 'localhost' && 
         window.location.hostname !== '127.0.0.1' &&
         !window.location.hostname.includes('preview');
};

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

    // Listen for interpreter status update events
    const handleStatusUpdate = () => {
      console.log('[useMissionUpdates] Received manual status update event');
      onUpdate();
    };
    eventEmitter.on(EVENT_INTERPRETER_STATUS_UPDATE, handleStatusUpdate);

    return () => {
      console.log('[useMissionUpdates] Cleaning up event listeners');
      window.removeEventListener("online", handleVisibilityChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      eventEmitter.off(EVENT_INTERPRETER_STATUS_UPDATE, handleStatusUpdate);
    };
  }, [onUpdate]);

  // Common subscription options
  const subscriptionOptions = {
    debugMode: isProduction() ? false : true, // Disable verbose logging in production
    maxRetries: isProduction() ? 10 : 3,      // Increase retries in production
    retryInterval: 5000,
    onError: (error: any) => {
      if (!isProduction()) {
        console.error('[useMissionUpdates] Subscription error:', error);
      } else {
        console.error('[useMissionUpdates] Realtime subscription issue. Will auto-retry.');
      }
    },
    // Use consistent channel names across the application
    channelNamePrefix: 'admin-mission-updates'
  };

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
    subscriptionOptions
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
    { ...subscriptionOptions, channelNamePrefix: 'admin-reservation-updates' }
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
      // This is a status update, trigger the refresh
      onUpdate();
    },
    {
      ...subscriptionOptions,
      retryInterval: 3000, // Shorter retry for status updates
      channelNamePrefix: 'admin-interpreter-status-updates'
    }
  );
};
