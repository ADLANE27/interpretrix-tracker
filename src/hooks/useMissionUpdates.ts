
import { useEffect, useRef, useCallback, useState } from 'react';
import { useRealtimeSubscription } from './use-realtime-subscription';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useMissionUpdates = (onUpdate: () => void) => {
  const { toast } = useToast();
  const [subscriptionFailures, setSubscriptionFailures] = useState<Record<string, boolean>>({});
  const failedSubscriptionsRef = useRef<Set<string>>(new Set());
  const lastUpdateRef = useRef<number>(0);
  const updateThrottleMs = 2000; // Throttle updates to prevent cascading requests
  const toastShownRef = useRef<boolean>(false);
  const manualPollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Function to throttle updates
  const throttledUpdate = useCallback(() => {
    const now = Date.now();
    if (now - lastUpdateRef.current > updateThrottleMs) {
      lastUpdateRef.current = now;
      onUpdate();
    } else {
      console.log('[useMissionUpdates] Update throttled');
    }
  }, [onUpdate]);
  
  // Function to manually poll data
  const pollData = useCallback(() => {
    if (document.visibilityState === 'visible' && failedSubscriptionsRef.current.size > 0) {
      console.log('[useMissionUpdates] Fallback polling due to subscription failures:', 
        Array.from(failedSubscriptionsRef.current));
      throttledUpdate();
    }
  }, [throttledUpdate]);

  // Manual polling as fallback for critical data
  useEffect(() => {
    // Clear any existing interval first
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    
    // Only set up polling if there are failed subscriptions
    if (failedSubscriptionsRef.current.size > 0) {
      console.log('[useMissionUpdates] Setting up fallback polling for failed subscriptions');
      pollIntervalRef.current = setInterval(pollData, 10000); // 10 second interval when subscriptions fail
    }
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [pollData, subscriptionFailures]);

  // Setup visibility change event listeners
  useEffect(() => {
    console.log('[useMissionUpdates] Setting up visibility change event listeners');
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[useMissionUpdates] App became visible, triggering update');
        throttledUpdate();
      }
    };

    const handleOnline = () => {
      console.log('[useMissionUpdates] Network connection restored, triggering update');
      throttledUpdate();
      
      // When connection is restored, schedule a delayed poll to ensure we have fresh data
      if (manualPollTimeoutRef.current) {
        clearTimeout(manualPollTimeoutRef.current);
      }
      
      manualPollTimeoutRef.current = setTimeout(() => {
        console.log('[useMissionUpdates] Performing additional poll after reconnection');
        throttledUpdate();
        
        // Clear failed subscription tracking on reconnect - we'll give the subscriptions a chance to reconnect
        failedSubscriptionsRef.current.clear();
        setSubscriptionFailures({});
        toastShownRef.current = false;
      }, 2000);
    };

    window.addEventListener("online", handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      console.log('[useMissionUpdates] Cleaning up event listeners');
      window.removeEventListener("online", handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (manualPollTimeoutRef.current) {
        clearTimeout(manualPollTimeoutRef.current);
        manualPollTimeoutRef.current = null;
      }
    };
  }, [throttledUpdate]);

  // Create a handler for subscription errors
  const handleSubscriptionError = useCallback((table: string, error: any) => {
    console.error(`[useMissionUpdates] Subscription error for ${table}:`, error);
    failedSubscriptionsRef.current.add(table);
    
    // Update the state to trigger the polling effect
    setSubscriptionFailures(prev => ({
      ...prev,
      [table]: true
    }));
    
    // Only show error toast once to avoid duplicate messages
    if (!toastShownRef.current) {
      toastShownRef.current = true;
      toast({
        title: "Problème de connexion",
        description: "Mise à jour automatique indisponible. Mode hors ligne activé.",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Update subscription success handler
  const handleSubscriptionSuccess = useCallback((table: string) => {
    if (failedSubscriptionsRef.current.has(table)) {
      console.log(`[useMissionUpdates] Subscription to ${table} recovered`);
      failedSubscriptionsRef.current.delete(table);
      
      // Update the state to reflect the change
      setSubscriptionFailures(prev => {
        const newState = { ...prev };
        delete newState[table];
        return newState;
      });
      
      // If all subscriptions are now working, we can clear the toast shown flag
      if (failedSubscriptionsRef.current.size === 0) {
        toastShownRef.current = false;
      }
    }
  }, []);

  // Subscribe to mission changes - more resilient with increased retry attempts
  const { reconnect: reconnectMissions } = useRealtimeSubscription(
    {
      event: '*',
      schema: 'public',
      table: 'interpretation_missions'
    },
    (payload) => {
      console.log('[useMissionUpdates] Mission update received:', payload);
      throttledUpdate();
      // Mark subscription as successful
      handleSubscriptionSuccess('interpretation_missions');
    },
    {
      debugMode: true,
      maxRetries: 5,
      retryInterval: 2000,
      onError: (error) => handleSubscriptionError('interpretation_missions', error)
    }
  );

  // Subscribe to reservation changes
  const { reconnect: reconnectReservations } = useRealtimeSubscription(
    {
      event: '*',
      schema: 'public',
      table: 'private_reservations'
    },
    (payload) => {
      console.log('[useMissionUpdates] Private reservation update received:', payload);
      throttledUpdate();
      handleSubscriptionSuccess('private_reservations');
    },
    {
      debugMode: true,
      maxRetries: 5,
      retryInterval: 2000,
      onError: (error) => handleSubscriptionError('private_reservations', error)
    }
  );
  
  // Subscribe to ALL interpreter profile changes - don't use filters as they can be unreliable
  const { reconnect: reconnectProfiles } = useRealtimeSubscription(
    {
      event: '*',
      schema: 'public',
      table: 'interpreter_profiles'
    },
    (payload) => {
      console.log('[useMissionUpdates] Interpreter profile update received:', payload);
      // Always update on status changes
      if (payload.new && payload.old && payload.new.status !== payload.old.status) {
        console.log('[useMissionUpdates] Interpreter status changed from', payload.old.status, 'to', payload.new.status);
        throttledUpdate();
      } else {
        console.log('[useMissionUpdates] Not a status change, skipping update');
      }
      handleSubscriptionSuccess('interpreter_profiles');
    },
    {
      debugMode: true,
      maxRetries: 5,
      retryInterval: 2000,
      onError: (error) => handleSubscriptionError('interpreter_profiles', error)
    }
  );

  // Expose a function to manually trigger reconnection of all subscriptions
  const reconnectAllSubscriptions = useCallback(() => {
    console.log('[useMissionUpdates] Manually reconnecting all subscriptions');
    reconnectMissions();
    reconnectReservations();
    reconnectProfiles();
    
    // Also trigger an immediate update
    throttledUpdate();
  }, [reconnectMissions, reconnectReservations, reconnectProfiles, throttledUpdate]);

  // Return the reconnect function for components to use if needed
  return {
    reconnectAllSubscriptions,
    hasFailedSubscriptions: failedSubscriptionsRef.current.size > 0
  };
};
