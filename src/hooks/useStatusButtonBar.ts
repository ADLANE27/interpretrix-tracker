
import { useState, useEffect, useRef } from 'react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { eventEmitter, EVENT_INTERPRETER_STATUS_UPDATED } from '@/lib/events';
import { updateInterpreterStatus } from '@/utils/statusUpdates';
import { Status } from '@/utils/statusButtonBarConfig';
import { statusButtonBarConfig } from '@/utils/statusButtonBarConfig';

export const useStatusButtonBar = (
  currentStatus: Status = 'available',
  onStatusChange?: (newStatus: Status) => Promise<void>
) => {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [localStatus, setLocalStatus] = useState<Status>(currentStatus);
  const userId = useRef<string | null>(null);
  const statusUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCount = useRef(0);
  const maxRetries = 3;

  // Get user ID once on component mount
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          userId.current = user.id;
          console.log('[useStatusButtonBar] User ID set:', user.id);
        } else {
          console.error('[useStatusButtonBar] No authenticated user found');
        }
      } catch (error) {
        console.error('[useStatusButtonBar] Error fetching user:', error);
      }
    };
    
    fetchUserId();
  }, []);

  // Listen for status updates from other components
  useEffect(() => {
    const handleStatusUpdate = (data: { interpreterId: string; status: string }) => {
      if (userId.current && data.interpreterId === userId.current && data.status !== localStatus) {
        console.log(`[useStatusButtonBar] Received status update event for ${userId.current}:`, data.status);
        setLocalStatus(data.status as Status);
      }
    };

    eventEmitter.on(EVENT_INTERPRETER_STATUS_UPDATED, handleStatusUpdate);
    
    return () => {
      eventEmitter.off(EVENT_INTERPRETER_STATUS_UPDATED, handleStatusUpdate);
    };
  }, [localStatus]);

  // Update local state when prop changes
  useEffect(() => {
    if (currentStatus && currentStatus !== localStatus) {
      console.log('[useStatusButtonBar] Current status updated from prop:', currentStatus);
      setLocalStatus(currentStatus);
    }
  }, [currentStatus, localStatus]);

  const handleStatusChange = async (newStatus: Status) => {
    if (!userId.current || localStatus === newStatus || isUpdating) return;
    
    try {
      setIsUpdating(true);
      console.log('[useStatusButtonBar] Changing status to:', newStatus);
      
      // Clear any existing timeout
      if (statusUpdateTimeoutRef.current) {
        clearTimeout(statusUpdateTimeoutRef.current);
      }
      
      const previousStatus = localStatus;
      
      // Optimistically update local state
      setLocalStatus(newStatus);
      
      // Use the centralized status update function
      const result = await updateInterpreterStatus(userId.current, newStatus, previousStatus);

      if (!result.success) {
        throw result.error || new Error("Failed to update status");
      }
      
      // Call the parent handler if exists
      if (onStatusChange) {
        await onStatusChange(newStatus);
      }
      
      retryCount.current = 0;
      console.log('[useStatusButtonBar] Status successfully changed to:', newStatus);
      
      // Show success toast
      toast({
        title: "Statut mis à jour",
        description: `Votre statut a été changé en "${statusButtonBarConfig[newStatus].label}"`,
      });
    } catch (error) {
      console.error('[useStatusButtonBar] Error changing status:', error);
      
      // Retry logic
      if (retryCount.current < maxRetries) {
        retryCount.current++;
        const retryDelay = 1000 * Math.pow(2, retryCount.current - 1); // Exponential backoff
        
        console.log(`[useStatusButtonBar] Retrying status update (${retryCount.current}/${maxRetries}) in ${retryDelay}ms`);
        
        statusUpdateTimeoutRef.current = setTimeout(() => {
          handleStatusChange(newStatus);
        }, retryDelay);
        
        return;
      }
      
      // Revert to previous status on final error with a slight delay to avoid UI flicker
      statusUpdateTimeoutRef.current = setTimeout(() => {
        setLocalStatus(currentStatus);
      }, 500);
      
      // Show error toast
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour votre statut. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    localStatus,
    isUpdating,
    handleStatusChange
  };
};
