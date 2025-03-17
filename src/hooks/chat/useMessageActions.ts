
import { useMessageSend } from './useMessageSend';
import { useMessageDelete } from './useMessageDelete';
import { useMessageReactions } from './useMessageReactions';
import { useMentionManagement } from './useMentionManagement';

export const useMessageActions = (
  channelId: string,
  currentUserId: string | null,
  fetchMessages: () => Promise<void>
) => {
  const { sendMessage } = useMessageSend(channelId, currentUserId, fetchMessages);
  const { deleteMessage } = useMessageDelete(currentUserId, fetchMessages);
  const { reactToMessage } = useMessageReactions(currentUserId);
  const { markMentionsAsRead } = useMentionManagement(channelId, currentUserId);

  return {
    sendMessage,
    deleteMessage,
    reactToMessage,
    markMentionsAsRead,
  };
};
