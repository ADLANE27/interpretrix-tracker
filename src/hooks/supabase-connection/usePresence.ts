
import { useCallback } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UsePresenceProps {
  presenceValidationDelay: number;
}

export const usePresence = ({ presenceValidationDelay }: UsePresenceProps) => {
  const validateChannelPresence = useCallback(async (channel: RealtimeChannel): Promise<boolean> => {
    try {
      if (!channel || channel.state !== 'joined') {
        console.warn('[usePresence] Channel not in correct state for presence validation');
        return false;
      }

      await channel.track({
        online_at: new Date().toISOString(),
        status: 'online'
      });

      await new Promise(resolve => setTimeout(resolve, presenceValidationDelay));

      const state = channel.presenceState();
      console.log('[usePresence] Validating presence state:', state);
      
      return state && Object.keys(state).length > 0;
    } catch (error) {
      console.error('[usePresence] Presence validation error:', error);
      return false;
    }
  }, [presenceValidationDelay]);

  return {
    validateChannelPresence
  };
};
