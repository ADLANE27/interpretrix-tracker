
import { useMessageOperations } from './useMessageOperations';
import { useReactions } from './useReactions';
import { useMentions } from './useMentions';

const useMessageActions = (
  channelId: string,
  currentUserId: string | null,
  fetchMessages: () => Promise<void>
) => {
  const { sendMessage, deleteMessage } = useMessageOperations(channelId, currentUserId, fetchMessages);
  const { reactToMessage } = useReactions(channelId, currentUserId, fetchMessages);
  const { markMentionsAsRead } = useMentions(channelId, currentUserId);

  return {
    sendMessage,
    deleteMessage,
    reactToMessage,
    markMentionsAsRead,
  };
};

export { useMessageActions };
