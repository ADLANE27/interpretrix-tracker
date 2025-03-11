
import { Message } from "@/types/messaging";
import { isToday, isYesterday, differenceInMinutes } from 'date-fns';

export interface MessageGroup {
  messages: Message[];
  date: Date;
  sender: Message['sender'];
}

export const shouldGroupMessage = (current: Message, previous?: Message): boolean => {
  if (!previous) return false;
  if (previous.sender.id !== current.sender.id) return false;
  
  const timeDiff = differenceInMinutes(
    new Date(current.timestamp),
    new Date(previous.timestamp)
  );
  
  return timeDiff < 5; // Group messages within 5 minutes
};

export const groupMessages = (messages: Message[]): MessageGroup[] => {
  const groups: MessageGroup[] = [];
  
  messages.forEach((message, index) => {
    const previousMessage = messages[index - 1];
    
    if (shouldGroupMessage(message, previousMessage)) {
      // Add to existing group
      groups[groups.length - 1].messages.push(message);
    } else {
      // Create new group
      groups.push({
        messages: [message],
        date: new Date(message.timestamp),
        sender: message.sender
      });
    }
  });
  
  return groups;
};

