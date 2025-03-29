
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from "@/hooks/useChat";
import { ChatInput } from "@/components/chat/ChatInput";
import { MessageList } from "@/components/chat/MessageList";
import { Message } from "@/types/messaging";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useBrowserNotification } from '@/hooks/useBrowserNotification';
import { RefreshCw, AtSign, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { motion } from "framer-motion";
import { useOptimizedChatSubscription } from '@/hooks/chat/useOptimizedChatSubscription';
import { AlertCircle } from "lucide-react";

interface EnhancedChatProps {
  channelId: string;
  userRole?: 'admin' | 'interpreter';
  messageListHeight?: string;
  onBackClick?: () => void;
}

const EnhancedChat = ({ 
  channelId, 
  userRole = 'admin', 
  messageListHeight = "calc(100vh - 300px)",
  onBackClick
}: EnhancedChatProps) => {
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
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const messageListKey = useRef<number>(0);
  const isMobile = useIsMobile();

  const {
    messages,
    isLoading,
    sendMessage,
    deleteMessage,
    currentUserId,
    reactToMessage,
    markMentionsAsRead,
    loadMoreMessages,
    hasMoreMessages
  } = useChat(channelId);

  // Use our new optimized subscription hook instead of the subscription logic in useChat
  const {
    isSubscribed,
    subscriptionState,
    forceReconnect
  } = useOptimizedChatSubscription(channelId, currentUserId, userRole);

  const { showNotification, requestPermission } = useBrowserNotification();
  const { toast } = useToast();

  useEffect(() => {
    if (channelId) {
      markMentionsAsRead();
    }
  }, [channelId, markMentionsAsRead]);

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  useEffect(() => {
    messageListKey.current += 1;
  }, [channelId]);

  useEffect(() => {
    if (messageContainerRef.current && autoScrollEnabled) {
      const container = messageContainerRef.current;
      
      setTimeout(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [messages, autoScrollEnabled]);

  const handleSendMessage = async () => {
    if ((!message.trim() && attachments.length === 0) || !channelId || !currentUserId) return;

    try {
      await sendMessage(message, replyTo?.id, attachments);
      setMessage('');
      setAttachments([]);
      setReplyTo(null);
      setAutoScrollEnabled(true);
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive",
      });
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

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    
    const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 50;
    if (!isAtBottom) {
      setAutoScrollEnabled(false);
    } else {
      setAutoScrollEnabled(true);
    }
    
    if (target.scrollTop < 50 && !isLoading && hasMoreMessages) {
      loadMoreMessages();
    }
  };

  const triggerMention = () => {
    if (!inputRef.current) return;
    
    const cursorPos = inputRef.current.selectionStart || 0;
    const textBeforeCursor = message.substring(0, cursorPos);
    const textAfterCursor = message.substring(cursorPos);
    
    const newMessage = textBeforeCursor + '@' + textAfterCursor;
    setMessage(newMessage);
    
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newPos = cursorPos + 1;
        inputRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  return (
    <div className="flex flex-col h-full">
      <motion.div 
        className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm flex flex-col px-3 md:px-6 sticky top-0 z-40 safe-area-top border-b border-gray-200/70 dark:border-gray-700/70 shadow-sm"
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, type: "spring" }}
      >
        <div className="h-[56px] md:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onBackClick && isMobile && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onBackClick}
                className="mr-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <motion.h2 
              className="text-lg font-semibold truncate flex-1 text-gradient-primary"
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              {channel?.name}
            </motion.h2>
          </div>
          
          {subscriptionState.status !== 'SUBSCRIBED' && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={forceReconnect}
              className="flex items-center gap-1 text-amber-600 border-amber-300 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-400"
            >
              <AlertCircle className="h-4 w-4 mr-1" />
              Reconnexion
            </Button>
          )}
        </div>
      </motion.div>

      <div className="flex flex-col flex-1 overflow-hidden">
        <div 
          className="flex-1 overflow-y-auto p-2 sm:p-4 scrollbar-none"
          ref={messageContainerRef} 
          id="messages-container" 
          data-channel-id={channelId}
          onScroll={handleScroll}
          style={{ height: messageListHeight }}
        >
          {isLoading ? (
            <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md flex items-center justify-center">
              <LoadingSpinner size="lg" text="Chargement des messages..." />
            </div>
          ) : !isSubscribed ? (
            <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md flex items-center justify-center">
              <LoadingSpinner size="md" text="Connexion en cours..." />
            </div>
          ) : null}
          
          {hasMoreMessages && !isLoading && (
            <div className="flex justify-center my-3">
              <Button 
                size="sm" 
                variant="outline"
                onClick={loadMoreMessages}
                className="text-xs flex items-center gap-1 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-gray-200/50 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
              >
                <RefreshCw className="h-3 w-3" />
                Charger plus de messages
              </Button>
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
          bg-white/80 dark:bg-gray-900/80 border-t border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm
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
            additionActions={
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-full"
                onClick={triggerMention}
              >
                <AtSign className="h-4 w-4 text-muted-foreground" />
              </Button>
            }
          />
        </div>
      </div>
    </div>
  );
};

export default EnhancedChat;
