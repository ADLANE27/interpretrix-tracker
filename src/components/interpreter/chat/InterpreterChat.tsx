
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from "@/hooks/useChat";
import { ChatInput } from "@/components/chat/ChatInput";
import { MessageList } from "@/components/chat/MessageList";
import { Message } from "@/types/messaging";
import { ChannelMembersPopover } from "@/components/chat/ChannelMembersPopover";
import { useIsMobile } from "@/hooks/use-mobile";
import { useOrientation } from "@/hooks/use-orientation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { playNotificationSound } from '@/utils/notificationSound';
import { useToast } from "@/hooks/use-toast";
import { useBrowserNotification } from '@/hooks/useBrowserNotification';
import { StatusButtonsBar } from "@/components/interpreter/StatusButtonsBar";
import { Menu, ArrowLeft, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Profile } from "@/types/profile";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { motion } from "framer-motion";

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
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const orientation = useOrientation();

  // Track whether we should include thread replies in filtering
  const [includeThreadReplies, setIncludeThreadReplies] = useState(true);

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
        // Show messages sent by the current user
        filtered = filtered.filter(msg => msg.sender.id === currentUserId);
      } else if (filters.userId === 'threads') {
        // Show messages that are part of threads the current user has participated in
        // First, find all thread IDs where the user has participated
        const userThreadIds = new Set<string>();
        
        messages.forEach(msg => {
          // If this is a user's message that is a reply, add the parent message id
          if (msg.sender.id === currentUserId && msg.parent_message_id) {
            userThreadIds.add(msg.parent_message_id);
          }
          
          // If this is a thread parent message from the user, add it
          if (msg.sender.id === currentUserId && !msg.parent_message_id) {
            userThreadIds.add(msg.id);
          }
        });
        
        // Filter to get all messages that are either:
        // 1. Parent messages of threads where the user participated
        // 2. Replies in threads where the user participated
        filtered = filtered.filter(msg => {
          // Include all thread parent messages that the user participated in
          if (userThreadIds.has(msg.id)) {
            return true;
          }
          
          // Include all replies to threads that the user participated in
          if (msg.parent_message_id && userThreadIds.has(msg.parent_message_id)) {
            return true;
          }
          
          return false;
        });
      } else {
        // Regular user filter
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
    // Add data-in-chat attribute to body to indicate we're in chat
    document.body.setAttribute('data-in-chat', 'true');
    
    return () => {
      document.body.removeAttribute('data-in-chat');
    };
  }, []);

  // Auto-scroll to bottom when new messages arrive, but only if already at bottom
  useEffect(() => {
    if (messageContainerRef.current) {
      const container = messageContainerRef.current;
      const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
      
      if (isAtBottom) {
        setTimeout(() => {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
          });
        }, 100);
      }
    }
  }, [messages]);

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
          avatarUrl: msg.sender.avatarUrl
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

  // Function to handle scroll to load more messages
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    // Load more messages when user scrolls near the top
    if (target.scrollTop < 50 && !isLoading && hasMoreMessages) {
      loadMoreMessages();
    }
  };

  // Show status buttons in all cases when in mobile portrait mode
  const showStatusButtons = isMobile && profile && onStatusChange && orientation === "portrait";
  
  return (
    <div className="flex flex-col h-full">
      <motion.div 
        className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm flex flex-col px-3 md:px-6 sticky top-0 z-40 safe-area-top border-b border-gray-200 dark:border-gray-700 shadow-sm"
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <div className="h-[56px] md:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isMobile && onBackToChannels && (
              <Button variant="ghost" size="icon" className="rounded-full" onClick={onBackToChannels}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            {isMobile && onMenuClick && (
              <Button variant="ghost" size="icon" className="rounded-full" onClick={onMenuClick}>
                <Menu className="h-5 w-5" />
              </Button>
            )}
          </div>
          
          <h2 className="text-lg font-semibold truncate flex-1 text-center md:text-left text-gradient-primary">
            {channel?.name}
          </h2>
          
          <ChannelMembersPopover 
            channelId={channelId} 
            channelName={channel?.name || ''} 
            channelType={(channel?.channel_type || 'group') as 'group' | 'direct'} 
            userRole="interpreter"
          >
            <Button variant="ghost" size="icon" className="rounded-full">
              <Users className="h-5 w-5" />
            </Button>
          </ChannelMembersPopover>
        </div>

        {/* Afficher les boutons de statut uniquement dans l'en-tête du chat si StatusButtonsBar-in-header n'existe pas */}
        {showStatusButtons && profile && onStatusChange && !document.querySelector('.StatusButtonsBar-in-header') && (
          <div className="pb-2 w-full overflow-visible">
            <StatusButtonsBar 
              currentStatus={profile.status} 
              onStatusChange={onStatusChange}
              variant="compact" 
            />
          </div>
        )}
      </motion.div>

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
            <Button 
              size="sm" 
              variant="outline"
              onClick={loadMoreMessages}
              className="text-xs"
            >
              Charger plus de messages
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
