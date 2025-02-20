
import { useCallback, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseHeartbeatProps {
  heartbeatInterval: number;
  heartbeatTimeout: number;
  onHeartbeatFailed: () => void;
}

export const useHeartbeat = ({ 
  heartbeatInterval, 
  heartbeatTimeout, 
  onHeartbeatFailed 
}: UseHeartbeatProps) => {
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();
  const heartbeatCheckIntervalRef = useRef<NodeJS.Timeout>();
  const lastHeartbeatRef = useRef<Date>();
  
  const clearIntervals = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = undefined;
    }
    if (heartbeatCheckIntervalRef.current) {
      clearInterval(heartbeatCheckIntervalRef.current);
      heartbeatCheckIntervalRef.current = undefined;
    }
  }, []);

  const setupHeartbeat = useCallback((
    channel: RealtimeChannel,
    isExplicitDisconnect: boolean,
    isReconnecting: boolean
  ) => {
    if (!channel || channel.state !== 'joined') {
      console.warn('[useHeartbeat] Cannot setup heartbeat - channel not joined');
      return false;
    }

    clearIntervals();
    lastHeartbeatRef.current = new Date();

    const sendHeartbeat = async () => {
      try {
        if (channel.state !== 'joined' || isExplicitDisconnect) {
          console.warn('[useHeartbeat] Channel not in correct state for heartbeat');
          return false;
        }

        await channel.send({
          type: 'broadcast',
          event: 'heartbeat',
          payload: { timestamp: new Date().toISOString() }
        });

        lastHeartbeatRef.current = new Date();
        console.log('[useHeartbeat] Heartbeat sent successfully');
        return true;
      } catch (error) {
        console.error('[useHeartbeat] Heartbeat send error:', error);
        return false;
      }
    };

    sendHeartbeat();

    heartbeatIntervalRef.current = setInterval(async () => {
      if (isExplicitDisconnect || isReconnecting) return;
      
      const success = await sendHeartbeat();
      if (!success && !isReconnecting) {
        console.log('[useHeartbeat] Heartbeat failed, initiating reconnect');
        onHeartbeatFailed();
      }
    }, heartbeatInterval);

    heartbeatCheckIntervalRef.current = setInterval(() => {
      if (isExplicitDisconnect || isReconnecting) return;
      
      if (lastHeartbeatRef.current) {
        const timeSinceLastHeartbeat = new Date().getTime() - lastHeartbeatRef.current.getTime();
        if (timeSinceLastHeartbeat > heartbeatTimeout) {
          console.warn('[useHeartbeat] Heartbeat timeout detected:', {
            timeSinceLastHeartbeat,
            heartbeatTimeout,
            lastHeartbeat: lastHeartbeatRef.current
          });
          if (!isReconnecting) {
            onHeartbeatFailed();
          }
        }
      }
    }, 10000);

    return true;
  }, [clearIntervals, heartbeatInterval, heartbeatTimeout, onHeartbeatFailed]);

  const updateLastHeartbeat = useCallback(() => {
    lastHeartbeatRef.current = new Date();
  }, []);

  return {
    setupHeartbeat,
    clearIntervals,
    updateLastHeartbeat
  };
};
