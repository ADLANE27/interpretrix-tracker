
import { useState, useEffect } from 'react';
import { Message } from '@/types/messaging';

export const useChatMembers = (messages: Message[], currentUserId: string | null) => {
  const [chatMembers, setChatMembers] = useState([
    { id: 'current', name: 'Mes messages' },
  ]);

  useEffect(() => {
    const uniqueMembers = new Map();
    
    if (currentUserId) {
      uniqueMembers.set('current', { id: 'current', name: 'Mes messages' });
    }

    messages.forEach(msg => {
      if (!uniqueMembers.has(msg.sender.id) && msg.sender.id !== currentUserId) {
        uniqueMembers.set(msg.sender.id, {
          id: msg.sender.id,
          name: msg.sender.name,
          avatarUrl: msg.sender.avatarUrl
        });
      }
    });

    setChatMembers(Array.from(uniqueMembers.values()));
  }, [messages, currentUserId]);

  return chatMembers;
};
