
import React, { useState, useRef, useEffect } from 'react';
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { useChat } from "@/hooks/useChat";
import { Message } from '@/types/messaging';

interface ChatContainerProps {
  channelId: string;
  userRole?: 'admin' | 'interpreter';
}

export const ChatContainer: React.FC<ChatContainerProps> = ({ 
  channelId, 
  userRole = 'admin' 
}) => {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messageListKey = useRef<number>(0);

  const {
    messages,
    isLoading,
    sendMessage,
    deleteMessage,
    currentUserId,
    reactToMessage,
    forceFetch
  } = useChat(channelId);

  // Reset key when channel changes to trigger a re-render
  useEffect(() => {
    messageListKey.current += 1;
  }, [channelId]);

  // Periodic refresh for chat messages
  useEffect(() => {
    const syncInterval = setInterval(() => {
      console.log(`[Chat ${userRole}] Forcing message sync`);
      forceFetch();
    }, 60000); // Sync every minute
    
    return () => clearInterval(syncInterval);
  }, [forceFetch, userRole]);

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    try {
      await sendMessage(message);
      setMessage('');
      setReplyTo(null);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log("File attachment functionality placeholder");
  };

  // Handle reactions
  const handleReactToMessage = async (messageId: string, emoji: string) => {
    try {
      console.log('[Chat] Adding reaction:', { messageId, emoji });
      await reactToMessage(messageId, emoji);
      console.log('[Chat] Reaction added successfully');
    } catch (error) {
      console.error('[Chat] Error adding reaction:', error);
    }
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-x-none" id="messages-container" data-channel-id={channelId}>
        <MessageList
          key={`message-list-${channelId}-${messageListKey.current}`}
          messages={messages}
          currentUserId={currentUserId}
          onDeleteMessage={deleteMessage}
          onReactToMessage={handleReactToMessage}
          replyTo={replyTo}
          setReplyTo={setReplyTo}
          channelId={channelId}
        />
      </div>
      
      <ChatInput
        message={message}
        setMessage={setMessage}
        onSendMessage={handleSendMessage}
        handleFileChange={handleFileChange}
        attachments={attachments}
        handleRemoveAttachment={(index: number) => {
          setAttachments(prev => prev.filter((_, i) => i !== index));
        }}
        inputRef={inputRef}
        replyTo={replyTo}
        setReplyTo={setReplyTo}
      />
    </>
  );
};
