
import { useState, useRef, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { StatusConfig } from '@/components/interpreter/StatusButton';
import { useMissionUpdates } from '@/hooks/useMissionUpdates';
import { Status } from '@/components/interpreter/StatusButton';
import { supabase } from '@/integrations/supabase/client';

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
  const failedAttemptsRef = useRef(0);
  const circuitBreakerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCircuitBrokenRef = useRef(false);
  const isProcessingRef = useRef(false);
  
  const { updateInterpreterStatus } = useMissionUpdates(() => {});

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
      if (circuitBreakerTimeoutRef.current) {
        clearTimeout(circuitBreakerTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (currentStatus && currentStatus !== localStatus && isValidStatus(currentStatus)) {
      console.log('[useStatusUpdater] Current status updated from prop:', currentStatus);
      setLocalStatus(currentStatus);
    }
  }, [currentStatus, localStatus]);

  useEffect(() => {
    const handleStatusUpdate = (event: CustomEvent<{
      interpreter_id: string, 
      status: Status, 
      transaction_id?: string,
      timestamp?: number
    }>) => {
      const detail = event.detail;
      if (!detail || !userId.current || detail.interpreter_id !== userId.current) return;
      
      console.log('[useStatusUpdater] Received status update event:', detail);
      
      if (!detail.status || detail.status === localStatus || !isValidStatus(detail.status)) return;
      
      const updateId = detail.transaction_id || `${detail.status}-${detail.timestamp || Date.now()}`;
      
      if (updateId === lastUpdateRef.current) {
        console.log('[useStatusUpdater] Skipping duplicate event:', updateId);
        return;
      }
      
      console.log('[useStatusUpdater] Updating local status to', detail.status);
      lastUpdateRef.current = updateId;
      setLocalStatus(detail.status);
      
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

  const isValidStatus = (status: string): status is Status => {
    return ['available', 'unavailable', 'pause', 'busy'].includes(status);
  };

  const handleStatusChange = async (newStatus: Status, statusConfig: Record<Status, StatusConfig>) => {
    if (newStatus === localStatus || !userId.current || isUpdating || isCircuitBrokenRef.current || isProcessingRef.current) {
      return;
    }
    
    isProcessingRef.current = true;
    
    try {
      setIsUpdating(true);
      console.log('[useStatusUpdater] Changing status to:', newStatus);
      
      // Update local state immediately for better UX
      setLocalStatus(newStatus);
      
      // Use the direct RPC function for reliable updates
      const { error } = await supabase.rpc('update_interpreter_status', {
        p_interpreter_id: userId.current,
        p_status: newStatus
      });
      
      if (error) {
        console.error('[useStatusUpdater] RPC error:', error);
        throw new Error(`RPC failed: ${error.message}`);
      }
      
      // Now use our helper from useMissionUpdates for the event dispatch
      const success = await updateInterpreterStatus(userId.current, newStatus);
      
      if (!success) {
        throw new Error('Failed to dispatch status update event');
      }
      
      if (onStatusChange) {
        try {
          await onStatusChange(newStatus);
        } catch (handlerError) {
          console.error('[useStatusUpdater] Error in parent handler:', handlerError);
          // Continue since the database update worked
        }
      }
      
      failedAttemptsRef.current = 0;
      
      toast({
        title: "Statut mis à jour",
        description: `Votre statut a été changé en "${statusConfig[newStatus].label}"`,
        duration: 3000,
      });
    } catch (error) {
      console.error('[useStatusUpdater] Error changing status:', error);
      
      failedAttemptsRef.current += 1;
      console.log(`[useStatusUpdater] Failed attempts: ${failedAttemptsRef.current}/${maxFailedAttempts}`);
      
      // Revert local status back to previous state
      setLocalStatus(currentStatus);
      
      if (failedAttemptsRef.current >= maxFailedAttempts) {
        console.log('[useStatusUpdater] Circuit breaker activated');
        isCircuitBrokenRef.current = true;
        
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
