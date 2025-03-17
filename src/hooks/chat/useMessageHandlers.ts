
import { useCallback } from 'react';
import { Message } from '@/types/messaging';
import { MutableRefObject } from 'react';

export const useMessageHandlers = (
  formatSingleMessage: (message: any, channelType: 'group' | 'direct' | null) => Promise<Message | null>,
  addMessage: (message: Message) => void,
  updateMessage: (message: Message) => void,
  removeMessage: (messageId: string) => void,
  messages: Message[],
  channelTypeRef: MutableRefObject<'group' | 'direct' | null>
) => {
  const handleNewMessage = useCallback(async (payload: any) => {
    if (!payload.new || !payload.new.id) return;
    
    try {
      // Don't add duplicates
      if (messages.some(m => m.id === payload.new.id)) {
        return;
      }
      
      const formattedMessage = await formatSingleMessage(payload.new, channelTypeRef.current);
      if (formattedMessage) {
        addMessage(formattedMessage);
      }
    } catch (error) {
      console.error('[Chat] Error handling new message:', error);
    }
  }, [messages, formatSingleMessage, addMessage, channelTypeRef]);
  
  const handleMessageUpdate = useCallback(async (payload: any) => {
    if (!payload.new || !payload.new.id) return;
    
    try {
      const formattedMessage = await formatSingleMessage(payload.new, channelTypeRef.current);
      if (formattedMessage) {
        updateMessage(formattedMessage);
      }
    } catch (error) {
      console.error('[Chat] Error handling message update:', error);
    }
  }, [formatSingleMessage, updateMessage, channelTypeRef]);
  
  const handleMessageDelete = useCallback(async (payload: any): Promise<void> => {
    if (!payload.old || !payload.old.id) return;
    
    try {
      removeMessage(payload.old.id);
    } catch (error) {
      console.error('[Chat] Error handling message deletion:', error);
    }
  }, [removeMessage]);

  return {
    handleNewMessage,
    handleMessageUpdate,
    handleMessageDelete
  };
};
