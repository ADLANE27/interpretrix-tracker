
import { useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Status } from '@/components/interpreter/StatusButton';

/**
 * Hook to handle interpreter status updates
 * This is the central place for updating interpreter status
 */
export const useInterpreterStatus = () => {
  const { toast } = useToast();
  const isProcessingRef = useRef(false);
  const operationsQueueRef = useRef<Array<{interpreterId: string, status: Status}>>([]);
  
  // Process operation queue
  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || operationsQueueRef.current.length === 0) return;
    
    isProcessingRef.current = true;
    const operation = operationsQueueRef.current.shift();
    
    if (!operation) {
      isProcessingRef.current = false;
      return;
    }
    
    try {
      await updateInterpreterStatusInternal(operation.interpreterId, operation.status);
    } finally {
      // Release lock with small delay to prevent race conditions
      setTimeout(() => {
        isProcessingRef.current = false;
        // Process next item in queue
        if (operationsQueueRef.current.length > 0) {
          processQueue();
        }
      }, 300);
    }
  }, []);
  
  // Internal function to update status
  const updateInterpreterStatusInternal = async (interpreterId: string, status: Status): Promise<boolean> => {
    try {
      console.log(`[useInterpreterStatus] Updating interpreter ${interpreterId} status to: ${status}`);
      
      // Generate transaction ID for deduplication
      const timestamp = Date.now();
      const transactionId = `${interpreterId}-${status}-${timestamp}`;
      
      // Use RPC function for reliable status updates
      const { error } = await supabase.rpc('update_interpreter_status', {
        p_interpreter_id: interpreterId,
        p_status: status
      });

      if (error) {
        console.error('[useInterpreterStatus] Status update error:', error);
        throw error;
      }
      
      // Dispatch global event with transaction ID to prevent duplicate processing
      window.dispatchEvent(new CustomEvent('interpreter-status-update', { 
        detail: { 
          interpreter_id: interpreterId,
          status: status,
          transaction_id: transactionId,
          timestamp: timestamp
        }
      }));
      
      return true;
    } catch (e) {
      console.error('[useInterpreterStatus] Status update exception:', e);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut. Veuillez réessayer.",
        variant: "destructive",
      });
      return false;
    }
  };
  
  /**
   * Update interpreter status with queue to prevent race conditions
   */
  const updateInterpreterStatus = useCallback(async (interpreterId: string, status: Status): Promise<boolean> => {
    // Add operation to queue
    operationsQueueRef.current.push({ interpreterId, status });
    // Try to process queue
    processQueue();
    return true;
  }, [processQueue]);

  return {
    updateInterpreterStatus,
    isProcessing: () => isProcessingRef.current
  };
};
