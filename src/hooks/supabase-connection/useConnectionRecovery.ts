
import { useCallback, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { CONNECTION_CONSTANTS } from './constants';

interface UseConnectionRecoveryProps {
  onReconnectStart: () => void;
  onReconnectEnd: () => void;
}

export const useConnectionRecovery = ({
  onReconnectStart,
  onReconnectEnd
}: UseConnectionRecoveryProps) => {
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }
  }, []);

  const handleReconnect = useCallback(async (
    channel: RealtimeChannel | null,
    isReconnecting: boolean,
    initializeChannel: () => Promise<void>
  ) => {
    if (isReconnecting) {
      console.log('[ConnectionRecovery] Already reconnecting, skipping');
      return;
    }

    clearReconnectTimeout();
    onReconnectStart();

    if (reconnectAttemptsRef.current >= CONNECTION_CONSTANTS.MAX_RECONNECT_ATTEMPTS) {
      console.error('[ConnectionRecovery] Max reconnection attempts reached');
      onReconnectEnd();
      return;
    }

    const delay = Math.min(
      CONNECTION_CONSTANTS.BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current),
      30000
    );
    
    console.log('[ConnectionRecovery] Attempting reconnection:', {
      attempt: reconnectAttemptsRef.current + 1,
      maxAttempts: CONNECTION_CONSTANTS.MAX_RECONNECT_ATTEMPTS,
      delay
    });

    reconnectTimeoutRef.current = setTimeout(async () => {
      reconnectAttemptsRef.current++;
      try {
        await initializeChannel();
      } catch (error) {
        console.error('[ConnectionRecovery] Reconnection attempt failed:', error);
        handleReconnect(channel, isReconnecting, initializeChannel);
      }
    }, delay);
  }, [clearReconnectTimeout, onReconnectStart, onReconnectEnd]);

  const resetReconnectAttempts = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    clearReconnectTimeout();
  }, [clearReconnectTimeout]);

  return {
    handleReconnect,
    resetReconnectAttempts,
    clearReconnectTimeout
  };
};
