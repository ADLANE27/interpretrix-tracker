
import { useCallback, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Message } from '@/types/messaging';
import { useMessageProcessing } from './useMessageProcessing';

export const useMessageRealtime = (
  channelId: string,
  messagesMap: React.MutableRefObject<Map<string, Message>>,
  setMessages: (messages: Message[]) => void
) => {
  const processingMessage = useRef<boolean>(false);
  const { formatMessage, userRole } = useMessageProcessing();

  const handleRealtimeMessage = useCallback(async (payload: any) => {
    if (processingMessage.current) return;
    
    processingMessage.current = true;
    console.log(`[useChat ${userRole.current}] Realtime message received:`, payload.eventType, payload);
    
    try {
      if (!payload || !payload.new || !channelId) {
        processingMessage.current = false;
        return;
      }
      
      const messageData = payload.new;
      if (messageData.channel_id !== channelId) {
        processingMessage.current = false;
        return;
      }
      
      // For inserts and updates, format and add the message
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        // Check if we already have this message to avoid duplicates
        if (payload.eventType === 'INSERT' && messagesMap.current.has(messageData.id)) {
          console.log(`[useChat ${userRole.current}] Skipping duplicate message:`, messageData.id);
          processingMessage.current = false;
          return;
        }
        
        // Get channel type for the message
        const { data: channelData } = await supabase
          .from('chat_channels')
          .select('channel_type')
          .eq('id', channelId)
          .single();
        
        const channelType = (channelData?.channel_type as 'group' | 'direct') || 'group';
        const formattedMessage = await formatMessage(messageData, channelType);
        
        if (formattedMessage) {
          // Update messagesMap
          messagesMap.current.set(messageData.id, formattedMessage);
          
          // Convert the Map to an array sorted by timestamp for consistent display
          const messagesArray = Array.from(messagesMap.current.values())
            .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
          
          setMessages(messagesArray);
          
          console.log(`[useChat ${userRole.current}] Realtime: Message added/updated:`, formattedMessage.id, 'For channel:', channelId);
        }
      } 
      // For deletions, remove the message
      else if (payload.eventType === 'DELETE') {
        const deletedId = payload.old.id;
        messagesMap.current.delete(deletedId);
        
        // Convert the Map to an array sorted by timestamp for consistent display
        const messagesArray = Array.from(messagesMap.current.values())
          .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        
        setMessages(messagesArray);
        console.log(`[useChat ${userRole.current}] Realtime: Message deleted:`, deletedId);
      }
    } catch (error) {
      console.error(`[useChat ${userRole.current}] Error handling realtime message:`, error);
    } finally {
      processingMessage.current = false;
    }
  }, [channelId, formatMessage, messagesMap, setMessages, userRole]);

  return {
    handleRealtimeMessage,
    processingMessage
  };
};
