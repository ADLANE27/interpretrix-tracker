
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export const createMessageChannel = (
  channelId: string,
  channelName: string,
  onMessageChange: (payload: any) => void
): RealtimeChannel => {
  console.log(`[subscriptionUtils] Creating message channel for ${channelName}`);
  
  const channel = supabase.channel(channelName);
  
  channel.on('postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'chat_messages',
      filter: `channel_id=eq.${channelId}`
    },
    (payload) => onMessageChange(payload)
  );
  
  return channel;
};

export const cleanupChannel = async (
  channel: RealtimeChannel | null, 
  logPrefix: string = 'subscriptionUtils'
): Promise<void> => {
  if (channel) {
    try {
      console.log(`[${logPrefix}] Removing channel`);
      await supabase.removeChannel(channel);
    } catch (error) {
      console.error(`[${logPrefix}] Error removing channel:`, error);
    }
  }
};

export const trackSeenEvents = (
  seenEvents: Set<string>,
  payload: any
): boolean => {
  const eventId = `${payload.eventType}-${
    payload.eventType === 'DELETE' ? 
    (payload.old as any)?.id : 
    (payload.new as any)?.id
  }-${payload.commit_timestamp}`;
  
  if (seenEvents.has(eventId)) {
    return false;
  }
  
  seenEvents.add(eventId);
  
  // Limit set size to prevent memory leaks
  if (seenEvents.size > 100) {
    const eventsArray = Array.from(seenEvents);
    seenEvents.clear();
    eventsArray.slice(-50).forEach(id => seenEvents.add(id));
  }
  
  return true;
};
