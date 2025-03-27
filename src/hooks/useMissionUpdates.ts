
import { useEffect, useRef } from 'react';
import { useRealtimeSubscription } from './use-realtime-subscription';
import { eventEmitter, EVENT_INTERPRETER_STATUS_UPDATE } from '@/lib/events';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

// Determine if we're in production mode
const isProduction = () => {
  return window.location.hostname !== 'localhost' && 
         window.location.hostname !== '127.0.0.1' &&
         !window.location.hostname.includes('preview');
};

export const useMissionUpdates = (onUpdate: () => void) => {
  const interpreterStatusChannelRef = useRef<RealtimeChannel | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = isProduction() ? 15 : 5;
  
  // Setup visibility change event listeners
  useEffect(() => {
    console.log('[useMissionUpdates] Setting up visibility change event listeners');
    let mounted = true;
    
    const handleVisibilityChange = () => {
      if (!mounted) return;
      
      if (document.visibilityState === 'visible') {
        console.log('[useMissionUpdates] App became visible, triggering update');
        onUpdate();
      }
    };

    const handleOnline = () => {
      if (!mounted) return;
      
      console.log('[useMissionUpdates] Network connection restored, triggering update');
      onUpdate();
      
      // Also try to resubscribe to the interpreter status channel
      if (interpreterStatusChannelRef.current && interpreterStatusChannelRef.current.state !== 'joined') {
        console.log('[useMissionUpdates] Resubscribing to interpreter status channel');
        interpreterStatusChannelRef.current.subscribe();
      }
    };

    window.addEventListener("online", handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Listen for interpreter status update events
    const handleStatusUpdate = () => {
      if (!mounted) return;
      
      console.log('[useMissionUpdates] Received manual status update event');
      onUpdate();
    };
    
    eventEmitter.on(EVENT_INTERPRETER_STATUS_UPDATE, handleStatusUpdate);

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
          if (!mounted) return;
          
          console.log('[useMissionUpdates] Direct status update received via channel:', payload);
          // First run the provided callback
          onUpdate();
          // Then propagate the event to other components
          eventEmitter.emit(EVENT_INTERPRETER_STATUS_UPDATE);
          
          // Reset retry counter on successful updates
          retryCountRef.current = 0;
        })
        .subscribe((status) => {
          console.log('[useMissionUpdates] Status channel subscription status:', status);
          
          if (status === 'CHANNEL_ERROR' && mounted) {
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
                if (mounted) {
                  retryCountRef.current++;
                  setupStatusChannel();
                }
              }, delay);
            }
          } else if (status === 'SUBSCRIBED' && mounted) {
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
      mounted = false;
      
      window.removeEventListener("online", handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
  }, [onUpdate]);

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
      console.log('[useMissionUpdates] Mission update received:', payload);
      onUpdate();
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
      console.log('[useMissionUpdates] Private reservation update received:', payload);
      onUpdate();
    },
    {
      ...subscriptionOptions,
      retryInterval: 5000, // Longer retry for reservations to spread out reconnection attempts
    }
  );
};
