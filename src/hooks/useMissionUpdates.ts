
import { useEffect } from 'react';
import { useRealtimeSubscription } from './use-realtime-subscription';
import { eventEmitter, EVENT_INTERPRETER_STATUS_UPDATE } from '@/lib/events';
import { supabase } from '@/integrations/supabase/client';

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

    const handleOnline = () => {
      console.log('[useMissionUpdates] Network connection restored, triggering update');
      onUpdate();
    };

    window.addEventListener("online", handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Listen for interpreter status update events
    const handleStatusUpdate = () => {
      console.log('[useMissionUpdates] Received manual status update event');
      onUpdate();
    };
    eventEmitter.on(EVENT_INTERPRETER_STATUS_UPDATE, handleStatusUpdate);

    // Set up a direct channel subscription for interpreter status changes
    const statusChannel = supabase.channel('interpreter-status-direct')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'interpreter_profiles',
        filter: 'status=eq.available,status=eq.unavailable,status=eq.busy,status=eq.pause'
      }, (payload) => {
        console.log('[useMissionUpdates] Direct status update received:', payload);
        onUpdate();
        // Also propagate the event to other components
        eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATE);
      }).subscribe();

    return () => {
      console.log('[useMissionUpdates] Cleaning up event listeners');
      window.removeEventListener("online", handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      eventEmitter.off(EVENT_INTERPRETER_STATUS_UPDATE, handleStatusUpdate);
      supabase.removeChannel(statusChannel);
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
    }
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
    subscriptionOptions
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
      // Also propagate the event
      eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATE);
    },
    {
      ...subscriptionOptions,
      retryInterval: 3000, // Shorter retry for status updates
    }
  );
};
