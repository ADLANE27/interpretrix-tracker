
import { eventEmitter, EVENT_NEW_MESSAGE_RECEIVED } from '@/lib/events';

export const useNewMessageHandler = (currentUserId: string | null) => {
  const handleNewMessage = (extendedPayload: any, channelId: string) => {
    if (extendedPayload.eventType === 'INSERT' && 
        extendedPayload.new && 
        extendedPayload.new.sender_id !== currentUserId) {
      
      // Improved mention detection logic
      const userMentioned = Boolean(
        extendedPayload.new.mentions && 
        Array.isArray(extendedPayload.new.mentions) && 
        extendedPayload.new.mentions.includes(currentUserId)
      );
      
      console.log(`[useNewMessageHandler] User mentioned in message:`, userMentioned, {
        mentions: extendedPayload.new.mentions,
        currentUserId: currentUserId
      });
      
      eventEmitter.emit(EVENT_NEW_MESSAGE_RECEIVED, {
        message: extendedPayload.new,
        channelId,
        isMention: userMentioned
      });
    }
  };
  
  return { handleNewMessage };
};
