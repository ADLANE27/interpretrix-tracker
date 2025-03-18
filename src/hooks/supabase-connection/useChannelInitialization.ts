
import { useCallback } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { CONNECTION_CONSTANTS } from './constants';

interface UseChannelInitializationProps {
  onChannelError: () => void;
  handleReconnect: (channel: RealtimeChannel | null) => Promise<void>;
  isExplicitDisconnect: boolean;
  isReconnecting: boolean;
  setConnectionStatus: (status: 'connected' | 'connecting' | 'disconnected') => void;
  updateLastHeartbeat: () => void;
}

export const useChannelInitialization = ({
  onChannelError,
  handleReconnect,
  isExplicitDisconnect,
  isReconnecting,
  setConnectionStatus,
  updateLastHeartbeat
}: UseChannelInitializationProps) => {
  const setupChannelSubscription = useCallback(async (
    channel: RealtimeChannel,
  ): Promise<void> => {
    if (!channel) return;

    channel
      .on('presence', { event: 'join' }, (payload) => {
        if (!isExplicitDisconnect) {
          updateLastHeartbeat();
        }
      })
      // Using the proper event type and function signature with all required parameters
      .on('broadcast', { event: 'heartbeat' }, (payload, context) => {
        if (!isExplicitDisconnect) {
          updateLastHeartbeat();
        }
      })
      .on('error', (error) => {
        console.error('[useChannelInitialization] Channel error:', error);
        onChannelError();
      });

    await channel.subscribe(async (status) => {
      console.log('[useChannelInitialization] Channel status:', status);

      if (status === 'SUBSCRIBED' && !isExplicitDisconnect) {
        setConnectionStatus('connected');
        updateLastHeartbeat();
      }

      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        console.error(`[useChannelInitialization] Channel ${status}`);
        setConnectionStatus('disconnected');
        if (!isExplicitDisconnect && !isReconnecting) {
          handleReconnect(channel);
        }
      }
    });
  }, [
    handleReconnect,
    isExplicitDisconnect,
    isReconnecting,
    onChannelError,
    setConnectionStatus,
    updateLastHeartbeat
  ]);

  return { setupChannelSubscription };
};
