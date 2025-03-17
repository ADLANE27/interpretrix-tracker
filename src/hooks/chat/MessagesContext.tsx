
import React, { createContext, useContext, ReactNode } from 'react';
import { Message } from '@/types/messaging';

interface MessageContextProps {
  children: ReactNode;
  value: {
    messages: { [channelId: string]: Message[] };
    addMessage: (channelId: string, message: Message) => void;
    updateMessage: (channelId: string, messageId: string, updates: Partial<Message>) => void;
    removeMessage: (channelId: string, messageId: string) => void;
    getMessages: (channelId: string) => Message[];
  };
}

const MessageContext = createContext<ReturnType<typeof useMessagesStore> | null>(null);

export const useMessagesStore = () => {
  const [messages, setMessages] = React.useState<{ [channelId: string]: Message[] }>({});

  const addMessage = React.useCallback((channelId: string, message: Message) => {
    setMessages(prev => {
      const channelMessages = [...(prev[channelId] || [])];
      const existingIndex = channelMessages.findIndex(m => m.id === message.id);
      
      if (existingIndex >= 0) {
        channelMessages[existingIndex] = message;
      } else {
        channelMessages.push(message);
      }
      
      // Sort by timestamp
      channelMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      return {
        ...prev,
        [channelId]: channelMessages
      };
    });
  }, []);

  const updateMessage = React.useCallback((channelId: string, messageId: string, updates: Partial<Message>) => {
    setMessages(prev => {
      const channelMessages = [...(prev[channelId] || [])];
      const existingIndex = channelMessages.findIndex(m => m.id === messageId);
      
      if (existingIndex >= 0) {
        channelMessages[existingIndex] = {
          ...channelMessages[existingIndex],
          ...updates
        };
        
        return {
          ...prev,
          [channelId]: channelMessages
        };
      }
      
      return prev;
    });
  }, []);

  const removeMessage = React.useCallback((channelId: string, messageId: string) => {
    setMessages(prev => {
      const channelMessages = (prev[channelId] || []).filter(m => m.id !== messageId);
      
      return {
        ...prev,
        [channelId]: channelMessages
      };
    });
  }, []);

  const getMessages = React.useCallback((channelId: string) => {
    return messages[channelId] || [];
  }, [messages]);

  return {
    messages,
    addMessage,
    updateMessage,
    removeMessage,
    getMessages
  };
};

export const MessageProvider: React.FC<MessageContextProps> = ({ children, value }) => {
  return (
    <MessageContext.Provider value={value}>
      {children}
    </MessageContext.Provider>
  );
};

export const useMessages = () => {
  const context = useContext(MessageContext);
  if (!context) throw new Error('useMessages must be used within a MessageProvider');
  return context;
};
