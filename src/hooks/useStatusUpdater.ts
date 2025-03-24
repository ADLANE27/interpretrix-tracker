
import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { StatusConfig } from '@/components/interpreter/StatusButton';

export type Status = "available" | "unavailable" | "pause" | "busy";

interface StatusUpdaterOptions {
  currentStatus?: Status;
  onStatusChange?: (newStatus: Status) => Promise<void>;
  maxFailedAttempts?: number;
  circuitBreakerTimeout?: number;
  processingDelay?: number;
}

export const useStatusUpdater = ({
  currentStatus = 'available',
  onStatusChange,
  maxFailedAttempts = 3,
  circuitBreakerTimeout = 30000,
  processingDelay = 300
}: StatusUpdaterOptions) => {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [localStatus, setLocalStatus] = useState<Status>(currentStatus);
  const lastUpdateRef = useRef<string | null>(null);
  const userId = useRef<string | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const failedAttemptsRef = useRef(0);
  const circuitBreakerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCircuitBrokenRef = useRef(false);
  const isProcessingRef = useRef(false);

  // Get user ID once on component mount
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          userId.current = user.id;
          console.log('[useStatusUpdater] User ID set:', user.id);
        }
      } catch (error) {
        console.error('[useStatusUpdater] Error fetching user ID:', error);
      }
    };
    
    fetchUserId();
    
    return () => {
      // Clean up any pending timeouts
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      
      if (circuitBreakerTimeoutRef.current) {
        clearTimeout(circuitBreakerTimeoutRef.current);
      }
    };
  }, []);

  // Update local state when prop changes
  useEffect(() => {
    if (currentStatus && currentStatus !== localStatus && isValidStatus(currentStatus)) {
      console.log('[useStatusUpdater] Current status updated from prop:', currentStatus);
      setLocalStatus(currentStatus);
    }
  }, [currentStatus, localStatus]);

  // Listen for global status updates
  useEffect(() => {
    const handleStatusUpdate = (event: CustomEvent<{interpreter_id: string, status: Status, timestamp?: number}>) => {
      const detail = event.detail;
      if (!detail || !userId.current || detail.interpreter_id !== userId.current) return;
      
      console.log('[useStatusUpdater] Received status update event:', detail);
      
      // Skip if the status isn't valid or hasn't changed
      if (!detail.status || detail.status === localStatus || !isValidStatus(detail.status)) return;
      
      // Create a unique update identifier
      const updateId = `${detail.status}-${detail.timestamp || Date.now()}`;
      
      // Skip if this is a duplicate of our last update
      if (updateId === lastUpdateRef.current) {
        console.log('[useStatusUpdater] Skipping duplicate event:', updateId);
        return;
      }
      
      console.log('[useStatusUpdater] Updating local status to', detail.status);
      lastUpdateRef.current = updateId;
      setLocalStatus(detail.status);
      
      // Reset circuit breaker on successful update
      if (isCircuitBrokenRef.current) {
        isCircuitBrokenRef.current = false;
        failedAttemptsRef.current = 0;
        
        if (circuitBreakerTimeoutRef.current) {
          clearTimeout(circuitBreakerTimeoutRef.current);
          circuitBreakerTimeoutRef.current = null;
        }
      }
    };
    
    window.addEventListener('interpreter-status-update', handleStatusUpdate as EventListener);
    
    return () => {
      window.removeEventListener('interpreter-status-update', handleStatusUpdate as EventListener);
    };
  }, [localStatus]);

  // Listen for real-time status updates from the database
  useEffect(() => {
    if (!userId.current) return;
    
    console.log('[useStatusUpdater] Setting up real-time status subscription');
    
    const channel = supabase.channel('interpreter-status-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'interpreter_profiles',
          filter: `id=eq.${userId.current}`
        },
        (payload) => {
          if (!payload.new) return;
          
          const newStatus = payload.new.status;
          console.log('[useStatusUpdater] Real-time status update received:', newStatus);
          
          if (!newStatus || !isValidStatus(newStatus) || newStatus === localStatus) return;
          
          // Create a unique update identifier
          const updateId = `${newStatus}-${Date.now()}`;
          
          // Skip if this is a duplicate of our last update
          if (updateId === lastUpdateRef.current) {
            console.log('[useStatusUpdater] Skipping duplicate update:', updateId);
            return;
          }
          
          console.log('[useStatusUpdater] Updating local status to', newStatus);
          lastUpdateRef.current = updateId;
          setLocalStatus(newStatus);
          
          // Reset circuit breaker on successful update
          if (isCircuitBrokenRef.current) {
            isCircuitBrokenRef.current = false;
            failedAttemptsRef.current = 0;
            
            if (circuitBreakerTimeoutRef.current) {
              clearTimeout(circuitBreakerTimeoutRef.current);
              circuitBreakerTimeoutRef.current = null;
            }
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [localStatus]);

  const isValidStatus = (status: string): status is Status => {
    return ['available', 'unavailable', 'pause', 'busy'].includes(status);
  };

  // Direct database update function - simplified to avoid race conditions
  const updateStatus = useCallback(async (status: Status) => {
    if (!userId.current) return false;
    
    try {
      console.log('[useStatusUpdater] Directly updating status in database:', status);
      
      // Use the RPC function for reliability
      const { error } = await supabase.rpc('update_interpreter_status', {
        p_interpreter_id: userId.current,
        p_status: status
      });
      
      if (error) {
        console.error('[useStatusUpdater] Database error:', error);
        throw error;
      }
      
      // Generate unique transaction ID for this update
      const timestamp = Date.now();
      const transactionId = `${status}-${timestamp}`;
      
      // Dispatch event with transaction ID to prevent duplicate processing
      window.dispatchEvent(new CustomEvent('interpreter-status-update', { 
        detail: { 
          interpreter_id: userId.current,
          status: status,
          timestamp: timestamp
        }
      }));
      
      return true;
    } catch (error) {
      console.error('[useStatusUpdater] Error updating status:', error);
      throw error;
    }
  }, []);

  // Improved status change handler with better error handling
  const handleStatusChange = async (newStatus: Status, statusConfig: Record<Status, StatusConfig>) => {
    // Skip if same status, no user ID, already updating, or circuit breaker is active
    if (newStatus === localStatus || !userId.current || isUpdating || isCircuitBrokenRef.current || isProcessingRef.current) {
      return;
    }
    
    // Set processing flag to prevent concurrent updates
    isProcessingRef.current = true;
    
    try {
      setIsUpdating(true);
      console.log('[useStatusUpdater] Changing status to:', newStatus);
      
      // Optimistically update local state
      setLocalStatus(newStatus);
      
      // Try database update first with proper error handling
      const success = await updateStatus(newStatus);
      
      if (!success) {
        throw new Error('Failed to update status in database');
      }
      
      // Then call the parent handler - but don't fail if it fails
      if (onStatusChange) {
        try {
          await onStatusChange(newStatus);
        } catch (handlerError) {
          console.error('[useStatusUpdater] Error in parent handler:', handlerError);
          // We already updated the DB directly, so continue without failing
        }
      }
      
      // Reset failed attempts on success
      failedAttemptsRef.current = 0;
      
      // Show success toast
      toast({
        title: "Statut mis à jour",
        description: `Votre statut a été changé en "${statusConfig[newStatus].label}"`,
        duration: 3000,
      });
    } catch (error) {
      console.error('[useStatusUpdater] Error changing status:', error);
      
      failedAttemptsRef.current += 1;
      console.log(`[useStatusUpdater] Failed attempts: ${failedAttemptsRef.current}/${maxFailedAttempts}`);
      
      // Revert to previous status on error
      setLocalStatus(currentStatus);
      
      // Implement circuit breaker pattern to prevent repeated failures
      if (failedAttemptsRef.current >= maxFailedAttempts) {
        console.log('[useStatusUpdater] Circuit breaker activated');
        isCircuitBrokenRef.current = true;
        
        // Reset circuit breaker after specified timeout
        circuitBreakerTimeoutRef.current = setTimeout(() => {
          console.log('[useStatusUpdater] Circuit breaker reset');
          isCircuitBrokenRef.current = false;
          failedAttemptsRef.current = 0;
        }, circuitBreakerTimeout);
        
        toast({
          title: "Erreur de connexion",
          description: "Trop d'erreurs de mise à jour. Réessayez dans 30 secondes.",
          variant: "destructive",
          duration: 5000,
        });
      } else {
        toast({
          title: "Erreur",
          description: "Impossible de mettre à jour votre statut. Veuillez réessayer.",
          variant: "destructive",
          duration: 3000,
        });
      }
    } finally {
      setIsUpdating(false);
      
      // Release the processing lock after a short delay to prevent rapid clicks
      setTimeout(() => {
        isProcessingRef.current = false;
      }, processingDelay);
    }
  };

  return {
    localStatus,
    isUpdating,
    isCircuitBroken: isCircuitBrokenRef.current,
    isProcessing: isProcessingRef.current,
    handleStatusChange
  };
};
