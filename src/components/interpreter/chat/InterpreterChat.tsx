
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from "@/hooks/useChat";
import { ChatInput } from "@/components/chat/ChatInput";
import { MessageList } from "@/components/chat/MessageList";
import { Message } from "@/types/messaging";
import { useIsMobile } from "@/hooks/use-mobile";
import { useOrientation } from "@/hooks/use-orientation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { playNotificationSound } from '@/utils/notificationSound';
import { useToast } from "@/hooks/use-toast";
import { useBrowserNotification } from '@/hooks/useBrowserNotification';
import { Menu, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Profile } from "@/types/profile";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { motion, AnimatePresence } from "framer-motion";

interface InterpreterChatProps {
  channelId: string;
  filters: {
    userId?: string;
    keyword?: string;
    date?: Date;
  };
  onFiltersChange: (filters: any) => void;
  onClearFilters: () => void;
  onBackToChannels?: () => void;
  profile?: Profile | null;
  onStatusChange?: (newStatus: Profile['status']) => Promise<void>;
  onMenuClick?: () => void;
}

export const InterpreterChat = ({ 
  channelId, 
  filters, 
  onFiltersChange, 
  onClearFilters,
  onBackToChannels,
  profile,
  onStatusChange,
  onMenuClick
}: InterpreterChatProps) => {
  const { data: channel, isLoading: isLoadingChannel } = useQuery({
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
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const orientation = useOrientation();
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [userRole, setUserRole] = useState<'admin' | 'interpreter' | null>(null);
  
  useEffect(() => {
    document.body.setAttribute('data-in-chat', 'active');
    
    return () => {
      document.body.removeAttribute('data-in-chat');
    };
  }, []);

  const {
    messages,
    isLoading,
    isSubscribed,
    sendMessage,
    deleteMessage,
    currentUserId,
    reactToMessage,
    markMentionsAsRead,
    forceFetch,
    loadMoreMessages,
    hasMoreMessages
  } = useChat(channelId);

  const { showNotification, requestPermission, settings, permission } = useBrowserNotification();

  const filteredMessages = useCallback(() => {
    let filtered = messages;

    if (filters.userId) {
      if (filters.userId === 'current') {
        filtered = filtered.filter(msg => msg.sender.id === currentUserId);
      } else if (filters.userId === 'threads') {
        const userThreadIds = new Set<string>();
        
        messages.forEach(msg => {
          if (msg.sender.id === currentUserId && msg.parent_message_id) {
            userThreadIds.add(msg.parent_message_id);
          }
          
          if (msg.sender.id === currentUserId && !msg.parent_message_id) {
            userThreadIds.add(msg.id);
          }
        });
        
        filtered = filtered.filter(msg => {
          if (userThreadIds.has(msg.id)) {
            return true;
          }
          
          if (msg.parent_message_id && userThreadIds.has(msg.parent_message_id)) {
            return true;
          }
          
          return false;
        });
      } else {
        filtered = filtered.filter(msg => msg.sender.id === filters.userId);
      }
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

  const { toast } = useToast();

  useEffect(() => {
    // Request notification permissions when entering the chat
    if (settings.enabled && permission !== 'granted') {
      requestPermission();
    }
  }, [requestPermission, settings, permission]);

  // Add effect to determine user role
  useEffect(() => {
    const determineUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        
        if (data) {
          setUserRole(data.role as 'admin' | 'interpreter');
        }
      } catch (error) {
        console.error('[InterpreterChat] Error determining user role:', error);
      }
    };
    
    determineUserRole();
  }, []);

  useEffect(() => {
    if (channelId) {
      const channel = supabase
        .channel(`chat-mentions-${channelId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'message_mentions'
          },
          async (payload) => {
            if (!payload.new || !currentUserId) return;
            
            if (payload.new.mentioned_user_id === currentUserId) {
              await playNotificationSound();
              
              // Get channel info for better notification context
              const { data: channelData } = await supabase
                .from('chat_channels')
                .select('name')
                .eq('id', channelId)
                .single();
                
              const channelName = channelData?.name || 'un canal';
              
              // Get message information
              const { data: messageData } = await supabase
                .from('chat_messages')
                .select('id, content, sender_id')
                .eq('id', payload.new.message_id)
                .single();
                
              if (!messageData) return;
              
              // Get sender information
              const { data: senderData } = await supabase
                .rpc('get_message_sender_details', {
                  sender_id: messageData.sender_id
                });
                
              const sender = senderData?.[0];
              if (!sender) return;
              
              // Build message preview
              const messagePreview = messageData.content.substring(0, 50) + 
                (messageData.content.length > 50 ? '...' : '');
              
              toast({
                title: "💬 Nouvelle mention",
                description: `${sender.name} vous a mentionné dans ${channelName}`,
                duration: 5000,
              });

              // Build message URL for direct navigation
              const baseUrl = userRole === 'admin' ? '/admin/messages' : '/interpreter/messages';
              const messageUrl = `${baseUrl}?channel=${channelId}&message=${messageData.id}`;

              // Enhanced notification with contextual information
              showNotification("Nouvelle mention", {
                body: `${sender.name} vous a mentionné dans ${channelName}: "${messagePreview}"`,
                tag: `mention-${messageData.id}`,
                requireInteraction: true,
                data: {
                  url: messageUrl,
                  messageId: messageData.id,
                  channelId: channelId,
                  senderId: messageData.sender_id,
                  type: 'mention'
                }
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [channelId, currentUserId, toast, showNotification, settings, userRole]);

  useEffect(() => {
    if (channelId) {
      console.log('[InterpreterChat] Channel loaded, mentions will be marked as read with delay');
    }
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
      setAutoScrollEnabled(true);
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

  const messageListHeight = isMobile 
    ? "calc(100vh - 220px)" // Reduced height on mobile to make room for input and nav
    : "calc(100vh - 180px)";
  
  return (
    <div className="flex flex-col h-full">
      <motion.div 
        className="bg-gradient-to-r from-white/90 to-palette-soft-blue/30 dark:from-gray-800/90 dark:to-palette-ocean-blue/20 backdrop-blur-md flex flex-col px-4 md:px-6 sticky top-0 z-40 safe-area-top border-b border-transparent dark:border-transparent shadow-sm"
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <div className="h-[56px] md:h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isMobile && onBackToChannels && (
              <Button variant="ghost" size="icon" className="rounded-full bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm hover:bg-white/60 dark:hover:bg-gray-700/60" onClick={onBackToChannels}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            {isMobile && onMenuClick && (
              <Button variant="ghost" size="icon" className="rounded-full bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm hover:bg-white/60 dark:hover:bg-gray-700/60" onClick={onMenuClick}>
                <Menu className="h-5 w-5" />
              </Button>
            )}
          </div>
          
          <AnimatePresence mode="wait">
            <motion.h2 
              key={channel?.name || 'loading'}
              className="text-lg font-semibold truncate flex-1 text-center md:text-left text-gradient-primary"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              transition={{ duration: 0.2 }}
            >
              {isLoadingChannel ? (
                <span className="inline-block w-32 h-6 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></span>
              ) : (
                channel?.name
              )}
            </motion.h2>
          </AnimatePresence>
          
          <div className="w-16 md:w-24"> 
            {/* Empty space to balance the layout */}
          </div>
        </div>
      </motion.div>

      <div className="flex flex-col flex-1 overflow-hidden bg-gradient-to-r from-white/90 to-palette-soft-blue/30 dark:from-gray-800/90 dark:to-palette-ocean-blue/20 backdrop-blur-md">
        <div 
          className="flex-1 overflow-y-auto p-3 sm:p-4 scrollbar-none"
          ref={messageContainerRef} 
          id="messages-container" 
          data-channel-id={channelId}
          onScroll={handleScroll}
          style={{ height: messageListHeight }}
        >
          {isLoading ? (
            <div className="absolute inset-0 bg-gradient-to-br from-white/70 to-palette-soft-blue/30 dark:from-gray-800/70 dark:to-palette-ocean-blue/20 backdrop-blur-md flex items-center justify-center">
              <LoadingSpinner size="lg" text="Loading messages..." />
            </div>
          ) : !isSubscribed ? (
            <div className="absolute inset-0 bg-gradient-to-br from-white/70 to-palette-soft-blue/30 dark:from-gray-800/70 dark:to-palette-ocean-blue/20 backdrop-blur-md flex items-center justify-center">
              <LoadingSpinner size="md" text="Connecting..." />
            </div>
          ) : null}
          
          {hasMoreMessages && !isLoading && (
            <div className="flex justify-center my-3">
              <Button 
                size="sm" 
                variant="outline"
                onClick={loadMoreMessages}
                className="text-xs flex items-center gap-1 bg-white/70 dark:bg-gray-800/50 backdrop-blur-sm border border-white/20 dark:border-gray-700/30 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
              >
                Load more messages
              </Button>
            </div>
          )}
          
          <MessageList
            messages={filteredMessages()}
            currentUserId={currentUserId}
            onDeleteMessage={deleteMessage}
            onReactToMessage={reactToMessage}
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
          handleRemoveAttachment={handleRemoveAttachment}
          inputRef={inputRef}
          replyTo={replyTo}
          setReplyTo={setReplyTo}
          style={isMobile ? { maxHeight: '120px', overflow: 'auto' } : undefined}
          className="bg-transparent mb-16 safe-area-bottom"
        />
      </div>
    </div>
  );
};

