
import { useEffect, useRef } from 'react';
import { useRealtimeSubscription } from './use-realtime-subscription';
import { debounce } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export const useMissionUpdates = (onUpdate: () => void) => {
  const { toast } = useToast();
  const lastInterpreterUpdateRef = useRef<Record<string, string>>({});
  
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
    const handleStatusUpdate = (event: CustomEvent) => {
      console.log('[useMissionUpdates] Interpreter status update event received:', event.detail);
      debouncedUpdate();
    };

    window.addEventListener("online", handleConnectionChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('interpreter-status-update', handleStatusUpdate as EventListener);

    return () => {
      console.log('[useMissionUpdates] Cleaning up event listeners');
      window.removeEventListener("online", handleConnectionChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('interpreter-status-update', handleStatusUpdate as EventListener);
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
        // Manual fallback if realtime subscription fails
        setTimeout(() => {
          console.log('[useMissionUpdates] Falling back to manual refresh after subscription error');
          debouncedUpdate();
        }, 5000);
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
        // Manual fallback if realtime subscription fails
        setTimeout(() => {
          console.log('[useMissionUpdates] Falling back to manual refresh after subscription error');
          debouncedUpdate();
        }, 5000);
      }
    }
  );
  
  // Direct poll for interpreter profiles with improved error handling
  useEffect(() => {
    const pollInterpreterProfiles = async () => {
      try {
        const { data, error } = await supabase
          .from('interpreter_profiles')
          .select('id, status')
          .order('updated_at', { ascending: false })
          .limit(30);
        
        if (error) throw error;
        
        if (data) {
          let hasUpdates = false;
          
          data.forEach(profile => {
            if (
              !lastInterpreterUpdateRef.current[profile.id] || 
              lastInterpreterUpdateRef.current[profile.id] !== profile.status
            ) {
              hasUpdates = true;
              lastInterpreterUpdateRef.current[profile.id] = profile.status;
              
              // Dispatch status update event
              window.dispatchEvent(new CustomEvent('interpreter-status-update', { 
                detail: { 
                  interpreterId: profile.id,
                  status: profile.status 
                }
              }));
            }
          });
          
          if (hasUpdates) {
            console.log('[useMissionUpdates] Detected interpreter status changes from polling');
            debouncedUpdate();
          }
        }
      } catch (err) {
        console.error('[useMissionUpdates] Error polling interpreter profiles:', err);
      }
    };
    
    // Poll every 10 seconds as a backup mechanism
    const intervalId = setInterval(pollInterpreterProfiles, 10000);
    
    // Initial poll
    pollInterpreterProfiles();
    
    return () => clearInterval(intervalId);
  }, [debouncedUpdate]);
  
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
      
      if (payload.new && payload.new.id && payload.new.status) {
        const { id, status } = payload.new;
        
        // Check if this is a new update
        if (!lastInterpreterUpdateRef.current[id] || lastInterpreterUpdateRef.current[id] !== status) {
          lastInterpreterUpdateRef.current[id] = status;
          
          // Dispatch a custom event to notify other components about the status change
          window.dispatchEvent(new CustomEvent('interpreter-status-update', { 
            detail: { 
              interpreterId: id,
              status: status 
            }
          }));
          
          // This is a status update, trigger the refresh
          debouncedUpdate();
        }
      }
    },
    {
      debugMode: true, // Enable debug mode for troubleshooting
      maxRetries: 5,
      retryInterval: 2000, // Shorter retry for status updates
      onError: (error) => {
        console.error('[useMissionUpdates] Status subscription error:', error);
        // If subscription fails, rely on polling as fallback
      }
    }
  );
};
