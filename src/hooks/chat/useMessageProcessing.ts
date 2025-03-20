
import { useCallback } from 'react';
import { Message, MessageData } from '@/types/messaging';
import { ChatChannelType } from './types/chatHooks';
import { useMessageMap } from './useMessageMap';
import { useMessageProcessingState } from './useMessageProcessingState';
import { useMessageProcessor } from './useMessageProcessor';
import { useUserRoleManager } from './useUserRoleManager';

export const useMessageProcessing = (channelId: string) => {
  // Message map management
  const {
    messages,
    setMessages,
    messagesMap,
    updateMessagesArray,
    messagesVersion
  } = useMessageMap();

  // Message processing state
  const {
    isLoading,
    setIsLoading,
    hasMoreMessages,
    setHasMoreMessages,
    processingMessage,
    lastFetchTimestamp,
    userRole,
    pendingMessageUpdates
  } = useMessageProcessingState();

  // Message processor
  const { processMessage: baseProcessMessage } = useMessageProcessor(userRole);

  // User role manager
  const { checkUserRole } = useUserRoleManager(userRole);

  // Wrap processMessage to simplify params
  const processMessage = useCallback(async (messageData: MessageData, channelType: ChatChannelType) => {
    return baseProcessMessage(
      messageData, 
      channelType, 
      messagesMap.current, 
      pendingMessageUpdates.current,
      updateMessagesArray
    );
  }, [baseProcessMessage, messagesMap, pendingMessageUpdates, updateMessagesArray]);

  return {
    // State
    messages,
    setMessages,
    isLoading,
    setIsLoading,
    hasMoreMessages,
    setHasMoreMessages,
    
    // Refs
    messagesMap,
    processingMessage,
    lastFetchTimestamp,
    userRole,
    
    // Functions
    updateMessagesArray,
    processMessage,
    checkUserRole,
    
    // Additional refs
    pendingMessageUpdates,
    messagesVersion
  };
};
