
import { Message } from '@/types/messaging';
import { useCallback } from 'react';

interface MessageFilteringProps {
  messages: Message[];
  filters: {
    userId?: string;
    keyword?: string;
    date?: Date;
  };
  currentUserId: string | null;
}

export const useMessageFiltering = ({ messages, filters, currentUserId }: MessageFilteringProps) => {
  const filteredMessages = useCallback(() => {
    let filtered = messages;

    if (filters.userId) {
      filtered = filtered.filter(msg => {
        if (filters.userId === 'current') {
          return msg.sender.id === currentUserId;
        }
        return msg.sender.id === filters.userId;
      });
    }

    if (filters.keyword) {
      const keywordLower = filters.keyword.toLowerCase();
      filtered = filtered.filter(msg =>
        msg.content.toLowerCase().includes(keywordLower)
      );
    }

    if (filters.date) {
      filtered = filtered.filter(msg => {
        const messageDate = new Date(msg.timestamp).toDateString();
        const filterDate = filters.date!.toDateString();
        return messageDate === filterDate;
      });
    }

    return filtered;
  }, [messages, filters, currentUserId]);

  return { filteredMessages };
};
