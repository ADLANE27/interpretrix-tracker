
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
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, AlertTriangle } from "lucide-react";

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
  const { data: channel, isLoading: isChannelLoading } = useQuery({
    queryKey: ['channel', channelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_channels')
        .select('*')
        .eq('id', channelId)
        .single();
      
      if (error) throw error;
      return data;
    },
    retry: 3,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  const [message, setMessage] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'in-sync' | 'syncing' | 'out-of-sync'>('in-sync');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

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
    retry: retryConnection,
    fetchMessages: refetchMessages,
    loadMoreMessages,
    hasMore,
    error: chatError,
    lastMessageTimestamp
  } = useChat(channelId);

  const { showNotification, requestPermission } = useBrowserNotification();

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

  // Handle mentions
  useEffect(() => {
    if (!channelId || !currentUserId) return;
    
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
  }, [channelId, currentUserId, toast, markMentionsAsRead, showNotification]);

  // Mark mentions as read when viewing channel
  useEffect(() => {
    if (channelId && !isLoading && currentUserId) {
      markMentionsAsRead();
    }
  }, [channelId, markMentionsAsRead, isLoading, currentUserId]);

  // Scroll to bottom on new messages or when messages are loaded
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesEndRef.current && !filters.userId && !filters.keyword && !filters.date) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        setHasScrolledToBottom(true);
      }
    };
    
    // Only scroll to bottom on initial load or when new messages are added
    if (messages.length > 0 && (!hasScrolledToBottom || document.hasFocus())) {
      // Slight delay to ensure DOM has updated
      const timer = setTimeout(scrollToBottom, 100);
      return () => clearTimeout(timer);
    }
  }, [messages.length, filters, hasScrolledToBottom]);

  // Handle file attachments
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    
    const fileArray = Array.from(files);
    setAttachments(prev => [...prev, ...fileArray]);
  };

  // Handle sending messages
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
      
      // Force scroll to bottom when sending a message
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer votre message. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => {
      const newAttachments = [...prev];
      newAttachments.splice(index, 1);
      return newAttachments;
    });
  };

  // Handle reconnection attempts
  const handleReconnect = useCallback(() => {
    setReconnecting(true);
    retryConnection();
    
    setTimeout(() => {
      setReconnecting(false);
    }, 5000); // Show reconnecting state for at least 5 seconds
  }, [retryConnection]);

  // Handle manual refresh (for when subscription is working but messages aren't loading)
  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setSyncStatus('syncing');
    
    try {
      await refetchMessages();
      toast({
        title: "Synchronisé",
        description: "Les messages ont été rafraîchis",
      });
      setSyncStatus('in-sync');
    } catch (error) {
      console.error("Error during manual refresh:", error);
      toast({
        title: "Erreur",
        description: "Impossible de rafraîchir les messages",
        variant: "destructive",
      });
      setSyncStatus('out-of-sync');
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchMessages, toast]);

  // Automatically refresh messages every 30 seconds if active in browser
  useEffect(() => {
    if (!isSubscribed || !channelId) return;
    
    const refreshInterval = setInterval(() => {
      if (document.hasFocus()) {
        console.log('[InterpreterChat] Auto-refreshing messages');
        handleManualRefresh();
      }
    }, 30 * 1000);
    
    return () => clearInterval(refreshInterval);
  }, [isSubscribed, channelId, handleManualRefresh]);

  // Log state changes to help with debugging
  useEffect(() => {
    console.log("[InterpreterChat] Status:", { 
      subscriptionStatus, 
      isSubscribed, 
      messageCount: messages.length, 
      isLoading,
      hasError: !!chatError,
      lastMessageTimestamp: lastMessageTimestamp?.toISOString()
    });
  }, [subscriptionStatus, isSubscribed, messages.length, isLoading, chatError, lastMessageTimestamp]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{channel?.name}</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleManualRefresh}
            className={`p-1.5 h-7 w-7 ${isRefreshing ? 'animate-spin' : ''}`}
            disabled={isRefreshing}
            title="Rafraîchir les messages"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          {syncStatus === 'out-of-sync' && (
            <span className="flex items-center text-amber-500 text-xs gap-1">
              <AlertTriangle className="h-3 w-3" />
              Désynchronisé
            </span>
          )}
        </div>
        <ChannelMembersPopover 
          channelId={channelId} 
          channelName={channel?.name || ''} 
          channelType={(channel?.channel_type || 'group') as 'group' | 'direct'} 
          userRole="interpreter"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-3 relative" ref={messageContainerRef}>
        {isChannelLoading ? (
          <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm flex flex-col items-center justify-center">
            <LoadingSpinner size="lg" />
            <p className="mt-2 text-lg font-semibold">Chargement des messages...</p>
          </div>
        ) : !isSubscribed ? (
          <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm flex flex-col items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <AlertCircle className="h-8 w-8 text-amber-500" />
              <p className="text-lg font-semibold text-center">
                {reconnecting ? 'Tentative de reconnexion...' : 'Connexion interrompue'}
              </p>
              <Button 
                variant="outline"
                onClick={handleReconnect}
                disabled={reconnecting}
              >
                {reconnecting ? 'Reconnexion en cours...' : 'Reconnecter'}
              </Button>
            </div>
          </div>
        ) : null}
        
        {filteredMessages().length === 0 && !isLoading && isSubscribed ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-center">
              {chatError ? (
                <>
                  Une erreur est survenue lors du chargement des messages.<br />
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={handleManualRefresh}
                    className="mt-2"
                  >
                    Réessayer
                  </Button>
                </>
              ) : (
                <>
                  Aucun message dans cette conversation.<br />
                  Envoyez votre premier message ci-dessous.
                </>
              )}
            </p>
          </div>
        ) : (
          <MessageList
            messages={filteredMessages()}
            currentUserId={currentUserId}
            onDeleteMessage={deleteMessage}
            onReactToMessage={reactToMessage}
            replyTo={replyTo}
            setReplyTo={setReplyTo}
            channelId={channelId}
            messagesEndRef={messagesEndRef}
            isLoading={isLoading}
            loadMoreMessages={loadMoreMessages}
            hasMore={hasMore}
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
        disabled={!currentUserId || !isSubscribed}
      />
    </div>
  );
};
