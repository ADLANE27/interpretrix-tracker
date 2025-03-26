import { useEffect, useRef } from 'react';
import { useRealtimeSubscription } from './use-realtime-subscription';
import { eventEmitter, EVENT_INTERPRETER_STATUS_UPDATE } from '@/lib/events';

// Determine if we're in production mode
const isProduction = () => {
  return window.location.hostname !== 'localhost' && 
         window.location.hostname !== '127.0.0.1' &&
         !window.location.hostname.includes('preview');
};

// Keep track of active subscriptions to avoid duplicates
const activeSubscriptionTables = new Set<string>();

export const useMissionUpdates = (onUpdate: () => void) => {
  const subscribedTablesRef = useRef<Set<string>>(new Set());
  
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
      console.log('[useMissionUpdates] App came online, triggering update');
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

    return () => {
      console.log('[useMissionUpdates] Cleaning up event listeners');
      window.removeEventListener("online", handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      eventEmitter.off(EVENT_INTERPRETER_STATUS_UPDATE, handleStatusUpdate);
    };
  }, [onUpdate]); // Properly include onUpdate in the dependency array

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

  // Helper function to setup a subscription only if not already active
  const setupSubscription = (table: string, event: string, filter: string | undefined, callback: (payload: any) => void) => {
    const subscriptionKey = `${table}:${event}:${filter || 'none'}`;
    
    // Skip if this component instance has already subscribed to this table/event/filter
    if (subscribedTablesRef.current.has(subscriptionKey)) {
      console.log(`[useMissionUpdates] Subscription to ${subscriptionKey} already exists in this instance`);
      return;
    }
    
    subscribedTablesRef.current.add(subscriptionKey);
    
    // Create a stable callback that doesn't change between renders
    const stableCallback = (payload: any) => {
      console.log(`[useMissionUpdates] ${table} update received:`, payload);
      callback(payload);
    };
    
    useRealtimeSubscription(
      {
        event: event as any,
        schema: 'public',
        table: table,
        filter: filter
      },
      stableCallback,
      subscriptionOptions
    );
  };

  // Subscribe to mission changes
  setupSubscription(
    'interpretation_missions',
    '*',
    undefined,
    onUpdate
  );

  // Subscribe to reservation changes
  setupSubscription(
    'private_reservations',
    '*',
    undefined,
    onUpdate
  );
  
  // Use a more specific subscription for interpreter profile status changes
  setupSubscription(
    'interpreter_profiles',
    'UPDATE',
    'status=eq.available,status=eq.busy,status=eq.pause,status=eq.unavailable',
    onUpdate
  );

  // Track cleanup of subscriptions
  useEffect(() => {
    return () => {
      // Clean up subscription tracking for this component instance
      subscribedTablesRef.current.clear();
    };
  }, []);
};
