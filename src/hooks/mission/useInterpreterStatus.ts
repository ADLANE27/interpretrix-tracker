
import { useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Status } from '@/components/interpreter/StatusButton';

/**
 * Hook to handle interpreter status updates
 */
export const useInterpreterStatus = () => {
  const { toast } = useToast();
  const isProcessingRef = useRef(false);
  
  /**
   * Update interpreter status in the database
   */
  const updateInterpreterStatus = async (interpreterId: string, status: Status): Promise<boolean> => {
    // Prevent concurrent updates
    if (isProcessingRef.current) {
      console.log('[useInterpreterStatus] Skipping concurrent update request');
      return false;
    }

    isProcessingRef.current = true;

    try {
      console.log(`[useInterpreterStatus] Directly updating interpreter ${interpreterId} status to: ${status}`);
      
      // Use database function for reliable status updates
      const { error } = await supabase.rpc('update_interpreter_status', {
        p_interpreter_id: interpreterId,
        p_status: status
      });

      if (error) {
        console.error('[useInterpreterStatus] Status update error:', error);
        toast({
          title: "Erreur",
          description: "Impossible de mettre à jour le statut. Veuillez réessayer.",
          variant: "destructive",
        });
        return false;
      }

      // Dispatch a global event with timestamp to notify other components
      const timestamp = Date.now();
      
      window.dispatchEvent(new CustomEvent('interpreter-status-update', { 
        detail: { 
          interpreter_id: interpreterId,
          status: status,
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
    } finally {
      // Release lock after short delay to prevent rapid consecutive updates
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 300);
    }
  };

  return {
    updateInterpreterStatus,
    isProcessing: isProcessingRef.current
  };
};
