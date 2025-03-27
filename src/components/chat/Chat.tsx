
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from "@/hooks/useChat";
import { ChatInput } from "@/components/chat/ChatInput";
import { MessageList } from "@/components/chat/MessageList";
import { Message } from "@/types/messaging";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { useIsMobile } from "@/hooks/use-mobile";
import { useOrientation } from "@/hooks/use-orientation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChatNotifications } from "@/hooks/chat/useChatNotifications";
import { useChatScroll } from "@/hooks/chat/useChatScroll";
import { AtSign } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { motion } from "framer-motion";

interface ChatProps {
  channelId: string;
  userRole?: 'admin' | 'interpreter';
}

const Chat = ({ channelId, userRole = 'admin' }: ChatProps) => {
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
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messageListKey = useRef<number>(0);
  const isMobile = useIsMobile();
  const orientation = useOrientation();

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
    forceFetch,
    loadMoreMessages,
    hasMoreMessages
  } = useChat(channelId);

  // Use our extracted hooks
  const { messageContainerRef, handleScroll } = useChatScroll({
    messages,
    isLoading,
    hasMoreMessages,
    loadMoreMessages
  });

  // Setup notifications
  useChatNotifications(channelId, currentUserId, markMentionsAsRead);

  useEffect(() => {
    messageListKey.current += 1;
  }, [channelId]);

  useEffect(() => {
    const syncInterval = setInterval(() => {
      console.log(`[Chat ${userRole}] Forcing message sync`);
      forceFetch();
    }, 60000); // Sync every minute
    
    return () => clearInterval(syncInterval);
  }, [forceFetch, userRole]);

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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    
    const fileArray = Array.from(files);
    setAttachments(prev => [...prev, ...fileArray]);
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
        channel={channel} 
        channelId={channelId} 
        userRole={userRole} 
        forceFetch={forceFetch} 
      />
      
      <div 
        className="flex-1 overflow-y-auto overflow-x-hidden overscroll-x-none relative p-2 sm:p-4" 
        ref={messageContainerRef} 
        id="messages-container" 
        data-channel-id={channelId}
        style={isMobile && orientation === "landscape" ? { maxHeight: 'calc(var(--vh, 1vh) * 100 - 160px)' } : {}}
        onScroll={handleScroll}
      >
        {isLoading ? (
          <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm flex items-center justify-center">
            <LoadingSpinner size="lg" text="Chargement des messages..." />
          </div>
        ) : !isSubscribed ? (
          <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm flex items-center justify-center">
            <LoadingSpinner size="md" text="Connexion en cours..." />
          </div>
        ) : null}
        
        {hasMoreMessages && !isLoading && (
          <div className="flex justify-center my-3">
            <motion.button 
              onClick={loadMoreMessages}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground px-3 py-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              Charger plus de messages
            </motion.button>
          </div>
        )}
        
        <MessageList
          key={`message-list-${channelId}-${messageListKey.current}`}
          messages={messages}
          currentUserId={currentUserId}
          onDeleteMessage={deleteMessage}
          onReactToMessage={reactToMessage}
          replyTo={replyTo}
          setReplyTo={setReplyTo}
          channelId={channelId}
        />
      </div>
      
      <div className={`
        ${isMobile && orientation === "landscape" ? "fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-700" : ""}
        ${isMobile ? "pt-1 pb-2 px-2" : "px-4 py-2"}
      `}>
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
          style={isMobile ? { maxHeight: '120px', overflow: 'auto' } : undefined}
        />
      </div>
    </div>
  );
};

export default Chat;
