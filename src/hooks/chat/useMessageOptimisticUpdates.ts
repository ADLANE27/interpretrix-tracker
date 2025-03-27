
import { useCallback } from 'react';
import { Message } from '@/types/messaging';

export const useMessageOptimisticUpdates = (
  messagesMap: React.MutableRefObject<Map<string, Message>>,
  setMessages: (messages: Message[]) => void,
  fetchMessages: (offset?: number) => Promise<void>,
  deleteMessageApi: (messageId: string) => Promise<void>
) => {
  // Modified function to handle message deletion with optimistic UI update
  const handleDeleteMessage = useCallback(async (messageId: string) => {
    try {
      // Optimistic UI update - remove the message from state immediately
      messagesMap.current.delete(messageId);
      
      // Update the messages array based on the updated map
      const updatedMessages = Array.from(messagesMap.current.values())
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      setMessages(updatedMessages);
      
      // Then perform the actual deletion on the server
      await deleteMessageApi(messageId);
      
      // No need to fetch messages again since we've already updated the UI
      console.log(`[useChat] Message deleted locally:`, messageId);
    } catch (error) {
      console.error(`[useChat] Error handling message deletion:`, error);
      // If there was an error, refresh messages to ensure UI is in sync
      fetchMessages(0);
    }
  }, [messagesMap, setMessages, fetchMessages, deleteMessageApi]);

  return { handleDeleteMessage };
};
