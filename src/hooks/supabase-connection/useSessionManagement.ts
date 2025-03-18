
import { useCallback } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { CONNECTION_CONSTANTS } from './constants';

interface UseSessionManagementProps {
  isExplicitDisconnect: boolean;
  isReconnecting: boolean;
  hasInitialized: boolean;
  onSessionInvalid: () => void;
  onSessionValid: () => void;
}

export const useSessionManagement = ({
  isExplicitDisconnect,
  isReconnecting,
  hasInitialized,
  onSessionInvalid,
  onSessionValid
}: UseSessionManagementProps) => {
  const checkSession = useCallback(async () => {
    if (isExplicitDisconnect) return false;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('[useSessionManagement] Session check: No active session');
        onSessionInvalid();
        return false;
      }
      
      onSessionValid();
      return true;
    } catch (error) {
      console.error('[useSessionManagement] Session check error:', error);
      return false;
    }
  }, [isExplicitDisconnect, onSessionInvalid, onSessionValid]);

  return { checkSession };
};
