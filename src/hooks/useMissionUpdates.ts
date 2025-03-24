
import { useEffect, useRef } from 'react';
import { useRealtimeSubscription } from './use-realtime-subscription';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useMissionUpdates = (onUpdate: () => void) => {
  const updateIdRef = useRef<string | null>(null);
  const { toast } = useToast();

  // Setup visibility change event listeners
  useEffect(() => {
    console.log('[useMissionUpdates] Setting up visibility change event listeners');
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[useMissionUpdates] App became visible, triggering update');
        onUpdate();
      }
    };

    // Listen for status update events
    const handleStatusUpdate = (event: CustomEvent<{interpreter_id: string, status: string, timestamp?: number}>) => {
      console.log('[useMissionUpdates] Status update event received, triggering refresh');
      
      // Create a unique update identifier to prevent duplicate processing
      const updateId = `${event.detail.status}-${event.detail.timestamp || Date.now()}`;
      
      // Skip if this is a duplicate of our last update
      if (updateId === updateIdRef.current) {
        console.log('[useMissionUpdates] Skipping duplicate event:', updateId);
        return;
      }
      
      updateIdRef.current = updateId;
      onUpdate();
    };

    window.addEventListener("online", handleVisibilityChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('interpreter-status-update', handleStatusUpdate as EventListener);

    return () => {
      console.log('[useMissionUpdates] Cleaning up event listeners');
      window.removeEventListener("online", handleVisibilityChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('interpreter-status-update', handleStatusUpdate as EventListener);
    };
  }, [onUpdate]);

  // Direct update function for immediate status changes
  const updateInterpreterStatus = async (interpreterId: string, status: string) => {
    try {
      console.log(`[useMissionUpdates] Directly updating interpreter ${interpreterId} status to: ${status}`);
      
      // Use database function for reliable updates
      const { error } = await supabase.rpc('update_interpreter_status', {
        p_interpreter_id: interpreterId,
        p_status: status
      });

      if (error) {
        console.error('[useMissionUpdates] Status update error:', error);
        toast({
          title: "Erreur",
          description: "Impossible de mettre à jour le statut. Veuillez réessayer.",
          variant: "destructive",
        });
        return false;
      }

      // Dispatch a global event to notify other components
      const timestamp = Date.now();
      const updateId = `${status}-${timestamp}`;
      updateIdRef.current = updateId;
      
      window.dispatchEvent(new CustomEvent('interpreter-status-update', { 
        detail: { 
          interpreter_id: interpreterId,
          status: status,
          timestamp: timestamp
        }
      }));
      
      return true;
    } catch (e) {
      console.error('[useMissionUpdates] Status update exception:', e);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut. Veuillez réessayer.",
        variant: "destructive",
      });
      return false;
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
    {
      debugMode: true,
      maxRetries: 5,
      retryInterval: 3000,
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
      maxRetries: 5,
      retryInterval: 3000,
      onError: (error) => {
        console.error('[useMissionUpdates] Subscription error:', error);
      }
    }
  );
  
  // Use a more specific subscription for interpreter profile status changes
  useRealtimeSubscription(
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'interpreter_profiles',
      filter: `status=neq.null`
    },
    (payload) => {
      if (!payload.new?.id || !payload.new?.status) return;
      
      console.log('[useMissionUpdates] Interpreter status update received:', payload);
      
      // Create a unique update identifier
      const updateId = `${payload.new.status}-${Date.now()}`;
      
      // Skip if this is a duplicate of our last update
      if (updateId === updateIdRef.current) {
        console.log('[useMissionUpdates] Skipping duplicate database event:', updateId);
        return;
      }
      
      updateIdRef.current = updateId;
      
      // This is a status update, trigger the refresh 
      onUpdate();
      
      // Dispatch a global event that other components can listen to
      window.dispatchEvent(new CustomEvent('interpreter-status-update', { 
        detail: { 
          interpreter_id: payload.new.id,
          status: payload.new.status,
          timestamp: Date.now()
        }
      }));
    },
    {
      debugMode: true,
      maxRetries: 5,
      retryInterval: 2000, // Shorter retry for status updates
      onError: (error) => {
        console.error('[useMissionUpdates] Status subscription error:', error);
      }
    }
  );
  
  return {
    updateInterpreterStatus
  };
};
