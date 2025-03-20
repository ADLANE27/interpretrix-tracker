
import { Message } from "@/types/messaging";
import { organizeMessageThreads } from './messageUtils';

export const useMessageOrganizer = (messages: Message[]) => {
  // Simplified function to organize message threads
  // Uses only the provided messages, with no complex conditional logic
  const organizeThreads = () => {
    return organizeMessageThreads(messages);
  };

  return { organizeThreads };
};
