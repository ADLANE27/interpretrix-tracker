
import { useCallback } from 'react';
import { MessageData } from '@/types/messaging';

interface BatchProcessorProps {
  processMessage: (messageData: MessageData, channelType: 'group' | 'direct') => Promise<void>;
  updateMessagesArray: () => void;
}

export function useBatchProcessor({ processMessage, updateMessagesArray }: BatchProcessorProps) {
  // Process messages in batches
  const processBatch = useCallback(async (
    messages: any[], 
    channelType: 'group' | 'direct',
    batchSize: number = 20
  ) => {
    const messagesToProcess = [...messages];
    
    for (let i = 0; i < messagesToProcess.length; i += batchSize) {
      const batch = messagesToProcess.slice(i, i + batchSize);
      const processPromises = batch.map(messageData => 
        processMessage(messageData, channelType)
      );
      
      await Promise.all(processPromises);
      
      // Update UI after processing half the messages and at the end
      if (i + batchSize >= messagesToProcess.length / 2) {
        updateMessagesArray();
      }
    }
    
    // Final update to ensure all messages are displayed
    updateMessagesArray();
    
    // Schedule additional updates for smoother rendering
    setTimeout(() => updateMessagesArray(), 50);
    setTimeout(() => updateMessagesArray(), 200);
  }, [processMessage, updateMessagesArray]);

  return { processBatch };
}
