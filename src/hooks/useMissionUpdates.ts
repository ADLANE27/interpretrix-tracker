
import { useEffect, useRef, useCallback } from 'react';
import { useRealtimeSubscription } from './use-realtime-subscription';
import { eventEmitter, EVENT_INTERPRETER_STATUS_UPDATE, EVENT_CONNECTION_STATUS_CHANGE, onConnectionStatusChange } from '@/lib/events';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

// Determine if we're in production mode
const isProduction = () => {
  return window.location.hostname !== 'localhost' && 
         window.location.hostname !== '127.0.0.1' &&
         !window.location.hostname.includes('preview');
};

// Prevent multiple initializations of the same handler
let isInitialized = false;

// Create a stable callback that doesn't change on each render
export const useMissionUpdates = (onUpdate: () => void) => {
  const interpreterStatusChannelRef = useRef<RealtimeChannel | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = isProduction() ? 15 : 5;
  const mountedRef = useRef(true);
  const alreadyInitializedRef = useRef(false);
  
  // Skip initialization if already done
  if (isInitialized && !alreadyInitializedRef.current) {
    console.log('[useMissionUpdates] Already initialized, skipping');
    alreadyInitializedRef.current = true;
    return;
  }
  
  if (!alreadyInitializedRef.current) {
    isInitialized = true;
    alreadyInitializedRef.current = true;
    console.log('[useMissionUpdates] First initialization');
  }
  
  // Stabilize the callback to prevent effect re-triggers
  const stableOnUpdate = useCallback(onUpdate, [onUpdate]);
  
  // Memoize handler functions to maintain stable references across renders
  const handleVisibilityChange = useCallback(() => {
    if (!mountedRef.current) return;
    
    if (document.visibilityState === 'visible') {
      console.log('[useMissionUpdates] App became visible, triggering update');
      stableOnUpdate();
    }
  }, [stableOnUpdate]);

  const handleOnline = useCallback(() => {
    if (!mountedRef.current) return;
    
    console.log('[useMissionUpdates] Network connection restored, triggering update');
    stableOnUpdate();
    
    // Also try to resubscribe to the interpreter status channel
    if (interpreterStatusChannelRef.current && interpreterStatusChannelRef.current.state !== 'joined') {
      console.log('[useMissionUpdates] Resubscribing to interpreter status channel');
      interpreterStatusChannelRef.current.subscribe();
    }
  }, [stableOnUpdate]);

  // Create a stable status update handler
  const handleStatusUpdate = useCallback(() => {
    if (!mountedRef.current) return;
    
    console.log('[useMissionUpdates] Received manual status update event');
    stableOnUpdate();
  }, [stableOnUpdate]);

  // Setup proper cleanup and event listeners
  useEffect(() => {
    console.log('[useMissionUpdates] Setting up visibility change event listeners');
    
    mountedRef.current = true;
    
    window.addEventListener("online", handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Listen for interpreter status update events - using a named handler for proper cleanup
    const statusHandlerKey = `mission-updates-status-handler-${Math.random().toString(36).substring(2, 9)}`;
    eventEmitter.on(EVENT_INTERPRETER_STATUS_UPDATE, handleStatusUpdate, statusHandlerKey);

    // Set up a direct realtime subscription for critical interpreter status changes
    const setupStatusChannel = () => {
      // Cleanup existing channel if any
      if (interpreterStatusChannelRef.current) {
        supabase.removeChannel(interpreterStatusChannelRef.current);
        interpreterStatusChannelRef.current = null;
      }
      
      const statusChannel = supabase.channel('interpreter-status-direct-updates')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'interpreter_profiles',
          filter: 'status=eq.available,status=eq.unavailable,status=eq.busy,status=eq.pause'
        }, (payload) => {
          if (!mountedRef.current) return;
          
          console.log('[useMissionUpdates] Direct status update received via channel:', payload);
          // First run the provided callback
          stableOnUpdate();
          // Then propagate the event to other components
          eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATE);
          
          // Reset retry counter on successful updates
          retryCountRef.current = 0;
        })
        .subscribe((status) => {
          console.log('[useMissionUpdates] Status channel subscription status:', status);
          
          if (status === 'CHANNEL_ERROR' && mountedRef.current) {
            console.error('[useMissionUpdates] Channel error, attempting recovery');
            
            // Clear any existing retry timeout
            if (retryTimeoutRef.current) {
              clearTimeout(retryTimeoutRef.current);
            }
            
            // Implement exponential backoff for retries
            if (retryCountRef.current < MAX_RETRIES) {
              const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
              console.log(`[useMissionUpdates] Retry ${retryCountRef.current + 1}/${MAX_RETRIES} in ${delay}ms`);
              
              retryTimeoutRef.current = setTimeout(() => {
                if (mountedRef.current) {
                  retryCountRef.current++;
                  setupStatusChannel();
                }
              }, delay);
            }
          } else if (status === 'SUBSCRIBED' && mountedRef.current) {
            console.log('[useMissionUpdates] Successfully subscribed to interpreter status channel');
            retryCountRef.current = 0;
          }
        });
      
      interpreterStatusChannelRef.current = statusChannel;
    };
    
    // Initial setup
    setupStatusChannel();

    // Use a stable connection status change handler 
    const connectionCleanup = onConnectionStatusChange((connected) => {
      if (!mountedRef.current) return;
      
      if (connected) {
        console.log('[useMissionUpdates] Connection restored, refreshing data');
        stableOnUpdate();
      }
    }, 'mission-updates-connection-handler');

    return () => {
      console.log('[useMissionUpdates] Cleaning up event listeners');
      mountedRef.current = false;
      
      window.removeEventListener("online", handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      eventEmitter.off(EVENT_INTERPRETER_STATUS_UPDATE, handleStatusUpdate, statusHandlerKey);
      
      // Use the helper cleanup function for connection status
      connectionCleanup();
      
      if (interpreterStatusChannelRef.current) {
        supabase.removeChannel(interpreterStatusChannelRef.current);
        interpreterStatusChannelRef.current = null;
      }
      
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      
      // Reset initialization flags on unmount
      isInitialized = false;
    };
  }, []); // Empty dependency array since we use stable callbacks

  // Common subscription options
  const subscriptionOptions = {
    debugMode: isProduction() ? false : true, // Disable verbose logging in production
    maxRetries: isProduction() ? 15 : 5,      // Increase retries in production
    retryInterval: 3000,
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
      if (!mountedRef.current) return;
      console.log('[useMissionUpdates] Mission update received:', payload);
      stableOnUpdate();
    },
    subscriptionOptions
  );

  // Subscribe to reservation changes with more focused filter
  useRealtimeSubscription(
    {
      event: '*',
      schema: 'public',
      table: 'private_reservations',
      filter: "status=eq.scheduled" // Only listen for scheduled reservations
    },
    (payload) => {
      if (!mountedRef.current) return;
      console.log('[useMissionUpdates] Private reservation update received:', payload);
      stableOnUpdate();
    },
    {
      ...subscriptionOptions,
      retryInterval: 5000, // Longer retry for reservations to spread out reconnection attempts
    }
  );
};
