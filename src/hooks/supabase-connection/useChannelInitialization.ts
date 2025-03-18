
import { useCallback } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { usePresence } from './usePresence';
import { useHeartbeat } from './useHeartbeat';
import { CONNECTION_CONSTANTS } from './constants';
import { useWakeLock } from './useWakeLock';

interface UseChannelInitializationProps {
  onChannelError: () => void;
  handleReconnect: (channel: RealtimeChannel | null, initializeChannel: () => Promise<void>) => void;
  isExplicitDisconnect: boolean;
  isReconnecting: boolean;
  setConnectionStatus: (status: 'connected' | 'connecting' | 'disconnected') => void;
  updateLastHeartbeat: () => void;
  setupHeartbeat: (
    channel: RealtimeChannel,
    isExplicitDisconnect: boolean,
    isReconnecting: boolean
  ) => boolean;
  validateChannelPresence: (channel: RealtimeChannel) => Promise<boolean>;
}

export const useChannelInitialization = ({
  onChannelError,
  handleReconnect,
  isExplicitDisconnect,
  isReconnecting,
  setConnectionStatus,
  updateLastHeartbeat,
  setupHeartbeat,
  validateChannelPresence
}: UseChannelInitializationProps) => {
  const { requestWakeLock } = useWakeLock();

  const setupChannelSubscription = useCallback(async (
    channel: RealtimeChannel,
  ) => {
    if (!channel) return;

    let presenceValidationTimeout: NodeJS.Timeout;

    channel
      .on('presence', { event: 'sync' }, async () => {
        if (isExplicitDisconnect) return;
        
        if (presenceValidationTimeout) {
          clearTimeout(presenceValidationTimeout);
        }

        presenceValidationTimeout = setTimeout(async () => {
          if (!channel) return;
          
          const isValid = await validateChannelPresence(channel);
          if (!isValid && !isReconnecting && !isExplicitDisconnect) {
            console.warn('[useChannelInitialization] Invalid presence state detected');
            handleReconnect(channel, () => setupChannelSubscription(channel));
          }
        }, CONNECTION_CONSTANTS.PRESENCE_VALIDATION_DELAY);
      })
      .on('presence', { event: 'join' }, () => {
        if (!isExplicitDisconnect) {
          updateLastHeartbeat();
        }
      })
      .on('broadcast', { event: 'heartbeat' }, () => {
        if (!isExplicitDisconnect) {
          updateLastHeartbeat();
        }
      })
      .on('error', (error) => {
        console.error('[useChannelInitialization] Channel error:', error);
        onChannelError();
      });

    return channel.subscribe(async (status) => {
      console.log('[useChannelInitialization] Channel status:', status);

      if (status === 'SUBSCRIBED' && !isExplicitDisconnect) {
        setConnectionStatus('connected');

        try {
          const isValid = await validateChannelPresence(channel);
          if (!isValid) {
            throw new Error('Failed to establish presence');
          }

          const heartbeatSetup = setupHeartbeat(channel, isExplicitDisconnect, isReconnecting);
          if (!heartbeatSetup) {
            throw new Error('Failed to setup heartbeat');
          }

          await requestWakeLock();
        } catch (error) {
          console.error('[useChannelInitialization] Channel setup error:', error);
          if (!isExplicitDisconnect && !isReconnecting) {
            handleReconnect(channel, () => setupChannelSubscription(channel));
          }
        }
      }

      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        console.error(`[useChannelInitialization] Channel ${status}`);
        setConnectionStatus('disconnected');
        if (!isExplicitDisconnect && !isReconnecting) {
          handleReconnect(channel, () => setupChannelSubscription(channel));
        }
      }
    });
  }, [
    handleReconnect,
    isExplicitDisconnect,
    isReconnecting,
    onChannelError,
    requestWakeLock,
    setConnectionStatus,
    setupHeartbeat,
    updateLastHeartbeat,
    validateChannelPresence
  ]);

  return { setupChannelSubscription };
};

