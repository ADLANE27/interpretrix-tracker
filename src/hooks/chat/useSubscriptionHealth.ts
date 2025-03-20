
import { useEffect, useRef } from 'react';
import { CONNECTION_CONSTANTS } from '@/hooks/supabase-connection/constants';

export const useSubscriptionHealth = (
  lastEventTimestamp: React.MutableRefObject<number>,
  retryCount: number,
  setRetryCount: (count: number) => void,
  channelRef: React.MutableRefObject<any>,
  userRole: React.MutableRefObject<string | null>
) => {
  useEffect(() => {
    const healthCheckInterval = setInterval(() => {
      const now = Date.now();
      const lastEvent = lastEventTimestamp.current;
      const timeSinceLastEvent = now - lastEvent;
      
      console.log(`[useSubscriptionHealth ${userRole.current}] Health check: ${timeSinceLastEvent}ms since last event`);
      
      if (timeSinceLastEvent > CONNECTION_CONSTANTS.BASE_RECONNECT_DELAY * 10 && channelRef.current) {
        console.log(`[useSubscriptionHealth ${userRole.current}] Subscription appears stalled, reconnecting...`);
        setRetryCount(retryCount + 1);
      }
    }, 30000);

    return () => {
      clearInterval(healthCheckInterval);
    };
  }, [retryCount, setRetryCount, lastEventTimestamp, channelRef, userRole]);
};
