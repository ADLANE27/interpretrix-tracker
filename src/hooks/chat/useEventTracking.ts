
import { useRef } from 'react';
import { trackSeenEvents } from './utils/subscriptionUtils';
import { ExtendedPayload } from './types/subscriptionTypes';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export const useEventTracking = (userRole: React.MutableRefObject<string | null>) => {
  const lastEventTimestamp = useRef<number>(Date.now());
  const seenEvents = useRef<Set<string>>(new Set());
  const instanceId = useRef<string>(`${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
  
  const trackEvent = (payload: RealtimePostgresChangesPayload<any>): ExtendedPayload | null => {
    if (!trackSeenEvents(seenEvents.current, payload)) {
      console.log(`[useEventTracking ${userRole.current}] Skipping duplicate event`);
      return null;
    }
    
    const extendedPayload: ExtendedPayload = {
      ...payload as any,
      eventType: payload.eventType,
      receivedAt: Date.now()
    };

    lastEventTimestamp.current = extendedPayload.receivedAt;
    
    console.log(`[useEventTracking ${userRole.current}] Message change received:`, 
      extendedPayload.eventType, extendedPayload);
    
    return extendedPayload;
  };
  
  return {
    lastEventTimestamp,
    instanceId,
    trackEvent
  };
};
