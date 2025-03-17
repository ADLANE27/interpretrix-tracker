
import React, { useState, useRef } from 'react';
import { useChat } from "@/hooks/useChat";
import { ChatInput } from "@/components/chat/ChatInput";
import { MessageList } from "@/components/chat/MessageList";
import { Message } from "@/types/messaging";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ChatHeader } from './ChatHeader';
import { ChatStateDisplay } from './ChatStateDisplay';
import { useMessageFiltering } from './MessageFiltering';
import { useChatMembers } from '@/hooks/interpreter/useChatMembers';
import { useChatNotifications } from '@/hooks/interpreter/useChatNotifications';

interface InterpreterChatProps {
  channelId: string;
  filters: {
    userId?: string;
    keyword?: string;
    date?: Date;
  };
  onFiltersChange: (filters: any) => void;
  onClearFilters: () => void;
}

export const InterpreterChat = ({ 
  channelId, 
  filters, 
  onFiltersChange, 
  onClearFilters 
}: InterpreterChatProps) => {
  const { data: channel } = useQuery({
    queryKey: ['channel', channelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_channels')
        .select('*')
        .eq('id', channelId)
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  const [message, setMessage] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const {
    messages,
    isLoading,
    isSubscribed,
    subscriptionStatus,
    sendMessage,
    deleteMessage,
    currentUserId,
    reactToMessage,
    markMentionsAsRead,
  } = useChat(channelId);

  const chatMembers = useChatMembers(messages, currentUserId);
  const { filteredMessages } = useMessageFiltering({ messages, filters, currentUserId });
  const { toast } = useToast();

  // Setup notifications
  useChatNotifications(channelId, currentUserId, markMentionsAsRead);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    
    const fileArray = Array.from(files);
    
    const totalSize = fileArray.reduce((sum, file) => sum + file.size, 0);
    const maxTotalSize = 100 * 1024 * 1024; // 100MB
    
    if (totalSize > maxTotalSize) {
      toast({
        title: "Erreur",
        description: "La taille totale des fichiers ne doit pas dépasser 100 Mo",
        variant: "destructive",
      });
      return;
    }
    
    setAttachments(prev => [...prev, ...fileArray]);
  };

  const handleSendMessage = async () => {
    if ((!message.trim() && attachments.length === 0) || !channelId || !currentUserId || isSending) return;

    try {
      setIsSending(true);
      await sendMessage(message, replyTo?.id, attachments);
      setMessage('');
      setAttachments([]);
      setReplyTo(null);
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('[Chat] Error sending message:', error);
      toast({
        title: "Erreur",
        description: "Échec de l'envoi du message",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessageWrapper = async (messageId: string) => {
    try {
      setIsDeleting(true);
      await deleteMessage(messageId);
      toast({
        title: "Succès",
        description: "Message supprimé",
      });
    } catch (error) {
      console.error('[Chat] Error deleting message:', error);
      toast({
        title: "Erreur",
        description: "Échec de la suppression du message",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => {
      const newAttachments = [...prev];
      newAttachments.splice(index, 1);
      return newAttachments;
    });
  };

  return (
    <div className="flex flex-col h-full">
      <ChatHeader 
        channelId={channelId} 
        channelName={channel?.name} 
        channelType={(channel?.channel_type || 'group') as 'group' | 'direct'} 
      />

      <div className="flex-1 overflow-y-auto p-3 relative">
        <ChatStateDisplay 
          isLoading={isLoading} 
          isSubscribed={isSubscribed} 
          subscriptionStatus={subscriptionStatus} 
        />
        
        <MessageList
          messages={filteredMessages()}
          currentUserId={currentUserId}
          onDeleteMessage={handleDeleteMessageWrapper}
          onReactToMessage={reactToMessage}
          replyTo={replyTo}
          setReplyTo={setReplyTo}
          channelId={channelId}
          isDeleting={isDeleting}
        />
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
        isLoading={isSending}
        isSubscribed={isSubscribed}
      />
    </div>
  );
};
