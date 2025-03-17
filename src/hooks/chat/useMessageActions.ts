
import { useMessageSend } from './useMessageSend';
import { useMessageDelete } from './useMessageDelete';
import { useMessageReactions } from './useMessageReactions';
import { useMentionManagement } from './useMentionManagement';
import { useEffect, useState } from 'react';

export const useMessageActions = (
  channelId: string,
  currentUserId: string | null,
  fetchMessages: () => Promise<void>
) => {
  const [isOnline, setIsOnline] = useState<boolean>(window.navigator.onLine);
  
  const { sendMessage } = useMessageSend(channelId, currentUserId, fetchMessages);
  const { deleteMessage } = useMessageDelete(currentUserId, fetchMessages);
  const { reactToMessage } = useMessageReactions(currentUserId);
  const { markMentionsAsRead } = useMentionManagement(channelId, currentUserId);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    sendMessage,
    deleteMessage,
    reactToMessage,
    markMentionsAsRead,
    connectionStatus: {
      isOnline
    }
  };
};
