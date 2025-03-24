
import { useEffect, useRef, useCallback } from 'react';
import { useRealtimeSubscription } from './use-realtime-subscription';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useMissionUpdates = (onUpdate: () => void) => {
  const { toast } = useToast();
  const failedSubscriptionsRef = useRef<Set<string>>(new Set());
  const lastUpdateRef = useRef<number>(0);
  const updateThrottleMs = 2000; // Throttle updates to prevent cascading requests
  
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
  
  // Manual polling as fallback for critical data
  useEffect(() => {
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible' && failedSubscriptionsRef.current.size > 0) {
        console.log('[useMissionUpdates] Fallback polling due to subscription failures:', 
          Array.from(failedSubscriptionsRef.current));
        throttledUpdate();
      }
    }, 15000); // 15 second polling interval when subscriptions fail
    
    return () => clearInterval(pollInterval);
  }, [throttledUpdate]);

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
      // Clear failed subscription tracking on reconnect
      failedSubscriptionsRef.current.clear();
    };

    window.addEventListener("online", handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      console.log('[useMissionUpdates] Cleaning up event listeners');
      window.removeEventListener("online", handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [throttledUpdate]);

  // Create a handler for subscription errors
  const handleSubscriptionError = useCallback((table: string, error: any) => {
    console.error(`[useMissionUpdates] Subscription error for ${table}:`, error);
    failedSubscriptionsRef.current.add(table);
    
    // Only show error toast for mission table, to avoid duplicate messages
    if (table === 'interpretation_missions' && !failedSubscriptionsRef.current.has('toast-shown')) {
      failedSubscriptionsRef.current.add('toast-shown');
      toast({
        title: "Problème de connexion",
        description: "Mise à jour automatique des missions indisponible. Actualisation manuelle activée.",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Subscribe to mission changes - more resilient with increased retry attempts
  useRealtimeSubscription(
    {
      event: '*',
      schema: 'public',
      table: 'interpretation_missions'
    },
    (payload) => {
      console.log('[useMissionUpdates] Mission update received:', payload);
      throttledUpdate();
      // Clear failed subscription record on successful update
      failedSubscriptionsRef.current.delete('interpretation_missions');
    },
    {
      debugMode: true,
      maxRetries: 5,
      retryInterval: 3000,
      onError: (error) => handleSubscriptionError('interpretation_missions', error)
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
      throttledUpdate();
      failedSubscriptionsRef.current.delete('private_reservations');
    },
    {
      debugMode: true,
      maxRetries: 5,
      retryInterval: 3000,
      onError: (error) => handleSubscriptionError('private_reservations', error)
    }
  );
  
  // Subscribe to ALL interpreter profile changes - don't use filters
  useRealtimeSubscription(
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
      failedSubscriptionsRef.current.delete('interpreter_profiles');
    },
    {
      debugMode: true,
      maxRetries: 5,
      retryInterval: 3000,
      onError: (error) => handleSubscriptionError('interpreter_profiles', error)
    }
  );
};
