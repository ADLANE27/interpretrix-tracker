
import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useTokenRefresh = () => {
  const tokenRefreshTimeoutRef = useRef<NodeJS.Timeout>();

  const scheduleTokenRefresh = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const expiresAt = session.expires_at;
      if (!expiresAt) return;

      // Calculate when to refresh (5 minutes before expiration)
      const expiresIn = new Date(expiresAt * 1000).getTime() - Date.now();
      const refreshIn = Math.max(0, expiresIn - 5 * 60 * 1000);

      // Clear any existing timeout
      if (tokenRefreshTimeoutRef.current) {
        clearTimeout(tokenRefreshTimeoutRef.current);
      }

      // Schedule refresh
      tokenRefreshTimeoutRef.current = setTimeout(async () => {
        try {
          const { error } = await supabase.auth.refreshSession();
          if (error) throw error;
          // Schedule next refresh
          scheduleTokenRefresh();
        } catch (error) {
          console.error('[TokenRefresh] Failed to refresh token:', error);
        }
      }, refreshIn);

    } catch (error) {
      console.error('[TokenRefresh] Error scheduling token refresh:', error);
    }
  }, []);

  useEffect(() => {
    scheduleTokenRefresh();
    return () => {
      if (tokenRefreshTimeoutRef.current) {
        clearTimeout(tokenRefreshTimeoutRef.current);
      }
    };
  }, [scheduleTokenRefresh]);

  return { scheduleTokenRefresh };
};
