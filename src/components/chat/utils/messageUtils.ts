
import { Message } from "@/types/messaging";

export const shouldShowDate = (currentMessage: Message, previousMessage?: Message): boolean => {
  if (!previousMessage) return true;
  
  const currentDate = new Date(currentMessage.timestamp);
  const previousDate = new Date(previousMessage.timestamp);
  
  return (
    currentDate.getDate() !== previousDate.getDate() ||
    currentDate.getMonth() !== previousMessage.timestamp.getMonth() ||
    currentDate.getFullYear() !== previousMessage.timestamp.getFullYear()
  );
};

export const organizeMessageThreads = (messages: Message[]): {
  rootMessages: Message[];
  messageThreads: Record<string, Message[]>;
} => {
  const rootMessages = messages.filter(message => !message.parent_message_id);
  
  const messageThreads = messages.reduce((acc: { [key: string]: Message[] }, message) => {
    const threadId = message.parent_message_id || message.id;
    if (!acc[threadId]) {
      acc[threadId] = [];
    }
    acc[threadId].push(message);
    return acc;
  }, {});
  
  return { rootMessages, messageThreads };
};
