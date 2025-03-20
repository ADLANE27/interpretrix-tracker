
import { useState, useRef } from 'react';

export const useMessageProcessingState = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const processingMessage = useRef(false);
  const lastFetchTimestamp = useRef<string | null>(null);
  const userRole = useRef<string>('unknown');
  const pendingMessageUpdates = useRef<Set<string>>(new Set());

  return {
    isLoading,
    setIsLoading,
    hasMoreMessages,
    setHasMoreMessages,
    processingMessage,
    lastFetchTimestamp,
    userRole,
    pendingMessageUpdates
  };
};
