
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from "@/hooks/useChat";
import { ChatInput } from "@/components/chat/ChatInput";
import { MessageList } from "@/components/chat/MessageList";
import { Message } from "@/types/messaging";
import { ChannelMembersPopover } from "@/components/chat/ChannelMembersPopover";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { playNotificationSound } from '@/utils/notificationSound';
import { useToast } from "@/hooks/use-toast";
import { useBrowserNotification } from '@/hooks/useBrowserNotification';
import { Button } from "@/components/ui/button";
import { ChevronDown, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useMessageScroll } from "@/hooks/chat/useMessageScroll"; // Import added

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
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const [chatMembers, setChatMembers] = useState([
    { id: 'current', name: 'Mes messages' },
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
    onlineUsers,
    hasConnectivityIssue,
    pendingMessages,
    clearFailedMessages // Added this function
  } = useChat(channelId);

  const { messagesEndRef, messagesContainerRef, scrollToBottom, shouldShowScrollButton, unreadCount } = 
    useMessageScroll(messages, isLoading, channelId, pendingMessages);

  const { showNotification, requestPermission } = useBrowserNotification();

  // Memoize the filtered messages to prevent unnecessary recalculations
  const filteredMessages = useCallback(() => {
    let filtered = messages;

    if (filters.userId) {
      filtered = filtered.filter(msg => {
        if (filters.userId === 'current') {
          return msg.sender.id === currentUserId;
        }
        return msg.sender.id === filters.userId;
      });
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
              // Play sound for mention
              await playNotificationSound();
              
              // Show toast notification
              toast({
                title: "💬 Nouvelle mention",
                description: "Quelqu'un vous a mentionné dans un message",
                duration: 5000,
              });

              // Show browser notification
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

  return (
    <div className="flex flex-col h-full" ref={chatContainerRef}>
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{channel?.name}</h2>
          {hasConnectivityIssue ? (
            <div className="flex items-center text-amber-500 text-xs gap-1 bg-amber-50 px-2 py-0.5 rounded-full">
              <WifiOff size={12} />
              <span>Reconnecting...</span>
            </div>
          ) : (
            <div className="flex items-center text-emerald-500 text-xs gap-1 bg-emerald-50 px-2 py-0.5 rounded-full">
              <Wifi size={12} />
              <span>{onlineUsers?.length || 0} online</span>
            </div>
          )}
        </div>
        <ChannelMembersPopover 
          channelId={channelId} 
          channelName={channel?.name || ''} 
          channelType={(channel?.channel_type || 'group') as 'group' | 'direct'} 
          userRole="interpreter"
        />
      </div>

      <div className="flex-1 overflow-hidden relative">
        {isLoading ? (
          <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-10">
            <p className="text-lg font-semibold">Chargement des messages...</p>
          </div>
        ) : !isSubscribed ? (
          <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm flex flex-col items-center justify-center z-10 gap-2">
            <AlertCircle className="h-6 w-6 text-amber-500" />
            <p className="text-lg font-semibold">
              Connexion en cours...
            </p>
            <p className="text-sm text-muted-foreground max-w-md text-center">
              Trying to establish a connection to the chat server. This may take a moment.
            </p>
          </div>
        ) : null}
        
        <div className="relative h-full" ref={messagesContainerRef}>
          <MessageList
            messages={filteredMessages()}
            currentUserId={currentUserId}
            onDeleteMessage={deleteMessage}
            onReactToMessage={reactToMessage}
            replyTo={replyTo}
            setReplyTo={setReplyTo}
            channelId={channelId}
            isLoading={isLoading}
          />
          <div ref={messagesEndRef} />
          
          {shouldShowScrollButton && (
            <div className="absolute bottom-4 right-4 z-10">
              <Button
                onClick={() => scrollToBottom('smooth')}
                size="sm"
                className="rounded-full shadow-md"
                variant="secondary"
              >
                <ChevronDown className="h-4 w-4 mr-1" />
                {unreadCount > 0 ? `${unreadCount} new` : 'Bottom'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {pendingMessages && pendingMessages.length > 0 && (
        <div className={cn(
          "px-4 py-2 text-sm bg-amber-50 border-t border-amber-100",
          "text-amber-800 flex items-center justify-between"
        )}>
          <span>{pendingMessages.length} message{pendingMessages.length > 1 ? 's' : ''} waiting to be sent</span>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs h-7 px-2 hover:bg-amber-100"
            onClick={() => clearFailedMessages()}
          >
            Clear Failed
          </Button>
        </div>
      )}

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
        isDisabled={hasConnectivityIssue && pendingMessages?.length >= 5}
        connectionStatus={hasConnectivityIssue ? 'offline' : 'online'}
      />
    </div>
  );
};
