
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Status } from '@/components/interpreter/StatusButton';

/**
 * Hook to handle interpreter status updates
 */
export const useInterpreterStatus = () => {
  const { toast } = useToast();
  
  const updateInterpreterStatus = useCallback(async (interpreterId: string, status: Status): Promise<boolean> => {
    try {
      console.log(`[useInterpreterStatus] Updating interpreter ${interpreterId} status to: ${status}`);
      
      // Direct update via SQL for guaranteed success rather than RPC
      const { error } = await supabase
        .from('interpreter_profiles')
        .update({ status: status })
        .eq('id', interpreterId);

      if (error) {
        console.error('[useInterpreterStatus] Status update error:', error);
        throw error;
      }
      
      // Dispatch global event to notify all components
      window.dispatchEvent(new CustomEvent('interpreter-status-update', { 
        detail: { 
          interpreter_id: interpreterId,
          status: status,
          timestamp: Date.now()
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
  }, [toast]);

  return {
    updateInterpreterStatus
  };
};
