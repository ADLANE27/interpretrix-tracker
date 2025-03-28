
import { useEffect, useRef, useCallback } from 'react';
import { useRealtimeSubscription } from './use-realtime-subscription';
import { eventEmitter, EVENT_INTERPRETER_STATUS_UPDATE, EVENT_CONNECTION_STATUS_CHANGE } from '@/lib/events';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

// Determine if we're in production mode
const isProduction = () => {
  return window.location.hostname !== 'localhost' && 
         window.location.hostname !== '127.0.0.1' &&
         !window.location.hostname.includes('preview');
};

// Create a stable callback that doesn't change on each render
export const useMissionUpdates = (onUpdate: () => void) => {
  const interpreterStatusChannelRef = useRef<RealtimeChannel | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = isProduction() ? 15 : 5;
  const stableOnUpdate = useCallback(onUpdate, [onUpdate]);
  const mountedRef = useRef(true);
  
  // Setup visibility change event listeners
  useEffect(() => {
    console.log('[useMissionUpdates] Setting up visibility change event listeners');
    
    // Create stable callback functions that won't change on rerenders
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
    
    window.addEventListener("online", handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Listen for interpreter status update events - using a named handler for proper cleanup
    eventEmitter.on(EVENT_INTERPRETER_STATUS_UPDATE, handleStatusUpdate, 'mission-updates-status-handler');

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

    return () => {
      console.log('[useMissionUpdates] Cleaning up event listeners');
      mountedRef.current = false;
      
      window.removeEventListener("online", handleOnline);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      eventEmitter.off(EVENT_INTERPRETER_STATUS_UPDATE, handleStatusUpdate);
      
      if (interpreterStatusChannelRef.current) {
        supabase.removeChannel(interpreterStatusChannelRef.current);
        interpreterStatusChannelRef.current = null;
      }
      
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [stableOnUpdate]);

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
