
import React, { useState, useRef } from 'react';
import { useChat } from "@/hooks/useChat";
import { ChatInput } from "@/components/chat/ChatInput";
import { MessageList } from "@/components/chat/MessageList";
import { Message } from "@/types/messaging";
import { SearchFilter } from "@/components/chat/SearchFilter";
import { ChannelMembersPopover } from "@/components/chat/ChannelMembersPopover";

interface ChatProps {
  channelId: string;
  filters: {
    userId?: string;
    keyword?: string;
    date?: Date;
  };
  onFiltersChange: (filters: any) => void;
  onClearFilters: () => void;
}

export const Chat = ({ channelId, filters, onFiltersChange, onClearFilters }: ChatProps) => {
  const [message, setMessage] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    messages,
    isLoading,
    sendMessage,
    deleteMessage,
    currentUserId,
    reactToMessage,
  } = useChat(channelId);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    
    const fileArray = Array.from(files);
    setAttachments(prev => [...prev, ...fileArray]);
  };

  const handleSendMessage = async () => {
    if ((!message.trim() && attachments.length === 0) || !channelId || !currentUserId) return;

    try {
      await sendMessage(message, replyTo?.id, attachments);
      setMessage('');
      setAttachments([]);
      setReplyTo(null);
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => {
      const newAttachments = [...prev];
      newAttachments.splice(index, 1);
      return newAttachments;
    });
  };

  const filteredMessages = messages.filter(msg => {
    if (filters.userId && msg.sender.id !== filters.userId) return false;
    if (filters.keyword && !msg.content.toLowerCase().includes(filters.keyword.toLowerCase())) return false;
    if (filters.date) {
      const messageDate = new Date(msg.timestamp).toDateString();
      const filterDate = filters.date.toDateString();
      return messageDate === filterDate;
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <SearchFilter filters={filters} onFiltersChange={onFiltersChange} onClearFilters={onClearFilters} />
          <ChannelMembersPopover channelId={channelId} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p>Loading messages...</p>
          </div>
        ) : (
          <MessageList
            messages={filteredMessages}
            currentUserId={currentUserId}
            onDeleteMessage={deleteMessage}
            onReactToMessage={reactToMessage}
            replyTo={replyTo}
            setReplyTo={setReplyTo}
          />
        )}
      </div>

      <ChatInput
        message={message}
        setMessage={setMessage}
        onSendMessage={handleSendMessage}
        handleFileChange={handleFileChange}
        attachments={attachments}
        handleRemoveAttachment={handleRemoveAttachment}
        inputRef={inputRef}
        replyTo={replyTo}
        setReplyTo={setReplyTo}
      />
    </div>
  );
};
