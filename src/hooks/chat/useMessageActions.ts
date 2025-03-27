
import { useMessageSend } from './useMessageSend';
import { useMessageDeletion } from './useMessageDeletion';
import { useMessageReactions } from './useMessageReactions';

export const useMessageActions = (
  channelId: string,
  currentUserId: string | null,
  fetchMessages: () => Promise<void>
) => {
  const { sendMessage } = useMessageSend(channelId, currentUserId, fetchMessages);
  const { deleteMessage } = useMessageDeletion(fetchMessages);
  const { reactToMessage, markMentionsAsRead } = useMessageReactions();

  return {
    sendMessage,
    deleteMessage: (messageId: string) => deleteMessage(messageId, currentUserId),
    reactToMessage: (messageId: string, emoji: string) => reactToMessage(messageId, emoji, currentUserId),
    markMentionsAsRead: () => markMentionsAsRead(currentUserId, channelId),
  };
};
