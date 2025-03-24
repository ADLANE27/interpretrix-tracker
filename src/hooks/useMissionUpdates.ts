
import { useEffect, useRef, useCallback } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from './use-realtime-subscription';
import { eventEmitter } from '@/lib/events';

// Define a constant for the status update event
export const EVENT_INTERPRETER_STATUS_UPDATE = 'interpreter-status-update';

export const useMissionUpdates = (onUpdate: () => void) => {
  const visibilityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Function to handle visibility change events with debouncing
  const handleVisibilityOrNetworkChange = useCallback(() => {
    // Clear any existing timeout to prevent multiple rapid triggers
    if (visibilityTimeoutRef.current) {
      clearTimeout(visibilityTimeoutRef.current);
    }
    
    // Only trigger update if document is visible
    if (document.visibilityState === 'visible' || navigator.onLine) {
      console.log('[useMissionUpdates] App became visible or network restored, triggering update');
      
      // Debounce the update with a short timeout
      visibilityTimeoutRef.current = setTimeout(() => {
        onUpdate();
        visibilityTimeoutRef.current = null;
      }, 500);
    }
  }, [onUpdate]);

  // Setup visibility change and network event listeners
  useEffect(() => {
    console.log('[useMissionUpdates] Setting up visibility and network event listeners');
    
    window.addEventListener("online", handleVisibilityOrNetworkChange);
    document.addEventListener('visibilitychange', handleVisibilityOrNetworkChange);

    // Listen for status update events from other components
    const handleStatusUpdate = () => {
      console.log('[useMissionUpdates] Received interpreter status update event');
      onUpdate();
    };
    
    // Subscribe to the custom event for status updates
    eventEmitter.on(EVENT_INTERPRETER_STATUS_UPDATE, handleStatusUpdate);

    return () => {
      console.log('[useMissionUpdates] Cleaning up event listeners');
      window.removeEventListener("online", handleVisibilityOrNetworkChange);
      document.removeEventListener('visibilitychange', handleVisibilityOrNetworkChange);
      eventEmitter.off(EVENT_INTERPRETER_STATUS_UPDATE, handleStatusUpdate);
      
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
        visibilityTimeoutRef.current = null;
      }
    };
  }, [onUpdate, handleVisibilityOrNetworkChange]);

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
  
  // Subscribe to interpreter profile status changes with an improved filter
  useRealtimeSubscription(
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'interpreter_profiles',
      filter: 'status=eq.available,status=eq.busy,status=eq.pause,status=eq.unavailable'
    },
    (payload) => {
      console.log('[useMissionUpdates] Interpreter status update received:', payload);
      onUpdate();
      
      // Emit the status update event so other components can respond
      eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATE);
    },
    {
      debugMode: true,
      maxRetries: 3,
      retryInterval: 3000,
      onError: (error) => {
        console.error('[useMissionUpdates] Status subscription error:', error);
      }
    }
  );
};
