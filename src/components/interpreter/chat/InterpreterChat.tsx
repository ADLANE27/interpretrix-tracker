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
import { StatusButtonsBar } from "@/components/interpreter/StatusButtonsBar";
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
  messageListHeight?: string;
}

export const InterpreterChat = ({ 
  channelId, 
  filters, 
  onFiltersChange, 
  onClearFilters,
  onBackToChannels,
  profile,
  onStatusChange,
  onMenuClick,
  messageListHeight = "calc(100vh - 320px)" // Default adjusted to account for header, footer, and status bar
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
  
  const [chatMembers, setChatMembers] = useState([
    { id: 'current', name: 'Mes messages' },
    { id: 'threads', name: 'Mes fils de discussion' },
  ]);

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

  const { showNotification, requestPermission } = useBrowserNotification();

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
    requestPermission();
  }, [requestPermission]);

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
              
              toast({
                title: "💬 Nouvelle mention",
                description: "Quelqu'un vous a mentionné dans un message",
                duration: 5000,
              });

              showNotification("Nouvelle mention", {
                body: "Quelqu'un vous a mentionné dans un message",
                tag: 'chat-mention',
              });
              
              markMentionsAsRead();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [channelId, currentUserId, toast, markMentionsAsRead, showNotification]);

  useEffect(() => {
    if (channelId) {
      markMentionsAsRead();
    }
  }, [channelId, markMentionsAsRead]);

  useEffect(() => {
    document.body.setAttribute('data-in-chat', 'true');
    
    return () => {
      document.body.removeAttribute('data-in-chat');
    };
  }, []);

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

  useEffect(() => {
    const uniqueMembers = new Map();
    
    if (currentUserId) {
      uniqueMembers.set('current', { id: 'current', name: 'Mes messages' });
      uniqueMembers.set('threads', { id: 'threads', name: 'Mes fils de discussion' });
    }

    messages.forEach(msg => {
      if (!uniqueMembers.has(msg.sender.id) && msg.sender.id !== currentUserId) {
        uniqueMembers.set(msg.sender.id, {
          id: msg.sender.id,
          name: msg.sender.name,
          avatar_url: msg.sender.avatar_url
        });
      }
    });

    setChatMembers(Array.from(uniqueMembers.values()));
  }, [messages, currentUserId]);

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

  const showStatusButtons = isMobile && profile && onStatusChange && orientation === "portrait";
  
  const adjustedMessageListHeight = "calc(100vh - 240px)";
  
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

        {showStatusButtons && profile && onStatusChange && (
          <div className="pb-2 w-full overflow-visible">
            <StatusButtonsBar 
              currentStatus={profile.status} 
              onStatusChange={onStatusChange}
              variant="compact" 
            />
          </div>
        )}
      </motion.div>

      <div className="flex flex-col flex-1 overflow-hidden bg-gradient-to-r from-white/90 to-palette-soft-blue/30 dark:from-gray-800/90 dark:to-palette-ocean-blue/20 backdrop-blur-md">
        <div 
          className="flex-1 overflow-y-auto p-3 sm:p-4 scrollbar-none"
          ref={messageContainerRef} 
          id="messages-container" 
          data-channel-id={channelId}
          onScroll={handleScroll}
          style={{ height: adjustedMessageListHeight }}
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
          className="bg-transparent"
        />
      </div>
    </div>
  );
};
