
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription";
import { eventEmitter, EVENT_INTERPRETER_STATUS_UPDATED } from '@/lib/events';
import { updateInterpreterStatus } from "@/utils/statusUpdates";
import { Profile } from "@/types/profile";

type Status = Profile['status'];

export const useInterpreterStatus = (
  currentStatus?: Status,
  onStatusChange?: (newStatus: Status) => Promise<void>
) => {
  const [status, setStatus] = useState<Status>(currentStatus || "available");
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const statusUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Listen for status updates from other components
  useEffect(() => {
    const handleStatusUpdate = (data: { interpreterId: string; status: string }) => {
      if (userId && data.interpreterId === userId && data.status !== status) {
        console.log(`[useInterpreterStatus] Received status update event for ${userId}:`, data.status);
        setStatus(data.status as Status);
      }
    };

    eventEmitter.on(EVENT_INTERPRETER_STATUS_UPDATED, handleStatusUpdate);
    
    return () => {
      eventEmitter.off(EVENT_INTERPRETER_STATUS_UPDATED, handleStatusUpdate);
    };
  }, [status, userId]);

  // Update local state when prop changes
  useEffect(() => {
    if (currentStatus && currentStatus !== status) {
      console.log('[useInterpreterStatus] Current status updated from prop:', currentStatus);
      setStatus(currentStatus);
    }
  }, [currentStatus]);

  // Get current user ID and set up real-time subscription
  useEffect(() => {
    const getCurrentUserId = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error('[useInterpreterStatus] No authenticated user found');
          return;
        }

        setUserId(user.id);
      } catch (error) {
        console.error('[useInterpreterStatus] Error getting user:', error);
      }
    };

    getCurrentUserId();
  }, []);

  // Set up realtime subscription for status updates
  useRealtimeSubscription(
    {
      event: 'UPDATE',
      table: 'interpreter_profiles',
      filter: userId ? `id=eq.${userId}` : undefined
    },
    (payload) => {
      console.log('[useInterpreterStatus] Status update received:', payload);
      const newStatus = payload.new.status;
      if (isValidStatus(newStatus)) {
        setStatus(newStatus);
      }
    },
    {
      enabled: !!userId,
      onError: (error) => {
        console.error('[useInterpreterStatus] Error in realtime subscription:', error);
      }
    }
  );

  const isValidStatus = (status: string): status is Status => {
    return ['available', 'unavailable', 'pause', 'busy'].includes(status);
  };

  const handleStatusChange = async (newStatus: Status) => {
    if (status === newStatus || !userId) return;
    
    setIsLoading(true);
    
    try {
      console.log('[useInterpreterStatus] Attempting status update for user:', userId);
      
      // Clear any existing timeout
      if (statusUpdateTimeoutRef.current) {
        clearTimeout(statusUpdateTimeoutRef.current);
      }
      
      const previousStatus = status;
      
      // Optimistically update local state
      setStatus(newStatus);
      
      // Use the centralized status update function
      const result = await updateInterpreterStatus(userId, newStatus, previousStatus);

      if (!result.success) {
        throw result.error || new Error("Failed to update status");
      }

      console.log('[useInterpreterStatus] Status update successful');

      if (onStatusChange) {
        await onStatusChange(newStatus);
      }

      toast({
        title: "Statut mis à jour",
        description: `Votre statut est maintenant "${getStatusLabel(newStatus)}"`,
      });
    } catch (error: any) {
      console.error('[useInterpreterStatus] Error updating status:', error);
      
      // Revert to previous status on error with a slight delay to avoid UI flicker
      statusUpdateTimeoutRef.current = setTimeout(() => {
        setStatus(currentStatus || 'available');
      }, 500);
      
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour votre statut. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    status,
    isLoading,
    handleStatusChange
  };
};

export const getStatusLabel = (status: Status): string => {
  const statusLabels: Record<Status, string> = {
    available: "Disponible",
    busy: "En appel",
    pause: "En pause",
    unavailable: "Indisponible"
  };
  
  return statusLabels[status] || status;
};
