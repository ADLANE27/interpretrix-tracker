
import { Message } from "@/types/messaging";
import { organizeMessageThreads } from './messageUtils';

export const useMessageOrganizer = (messages: Message[]) => {
  // Use stable messages when they exist and current messages are empty
  const organizeThreads = (
    messages: Message[], 
    stableMessages: React.MutableRefObject<Message[]>,
    hadMessages: React.MutableRefObject<boolean>
  ) => {
    const messagesToUse = messages.length > 0 ? messages : 
      (hadMessages.current && stableMessages.current.length > 0 ? stableMessages.current : messages);
    
    return organizeMessageThreads(messagesToUse);
  };

  return { organizeThreads };
};
