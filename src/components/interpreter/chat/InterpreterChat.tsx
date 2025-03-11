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
import { Badge } from "@/components/ui/badge";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from 'lucide-react';

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

interface MessagePayload {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  channel_id: string;
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isMobile = useIsMobile();
  const [showChannelList, setShowChannelList] = useState(true);

  const [chatMembers, setChatMembers] = useState([
    { id: 'current', name: 'Mes messages' },
  ]);

  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);

  const {
    messages: realMessages,
    isLoading,
    isSubscribed,
    subscriptionStatus,
    sendMessage,
    deleteMessage,
    currentUserId,
    reactToMessage,
    markMentionsAsRead,
  } = useChat(channelId);

  const { showNotification, requestPermission } = useBrowserNotification();

  useEffect(() => {
    onClearFilters();
  }, [channelId, onClearFilters]);

  const senderDetailsCache = useRef<Map<string, { id: string; name: string; avatarUrl?: string }>>(
    new Map()
  );

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

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    
    const fileArray = Array.from(files);
    setAttachments(prev => [...prev, ...fileArray]);
  };

  const handleSendMessage = async () => {
    if ((!message.trim() && attachments.length === 0) || !channelId || !currentUserId) return;

    const optimisticId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: optimisticId,
      content: message,
      sender: {
        id: currentUserId,
        name: 'You',
        avatarUrl: ''
      },
      timestamp: new Date(),
      channelType: 'group'
    };

    try {
      setOptimisticMessages(prev => [...prev, optimisticMessage]);
      await sendMessage(message, replyTo?.id, attachments);
      setMessage('');
      setAttachments([]);
      setReplyTo(null);
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }
    } catch (error) {
      setOptimisticMessages(prev => prev.filter(msg => msg.id !== optimisticId));
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

  useEffect(() => {
    if (channelId) {
      const messagesChannel = supabase
        .channel(`chat-${channelId}`)
        .on('postgres_changes' as never,
          {
            event: '*',
            schema: 'public',
            table: 'chat_messages',
            filter: `channel_id=eq.${channelId}`
          },
          async (payload: { new: MessagePayload }) => {
            if (!payload.new || !currentUserId) return;
            
            let senderDetails = senderDetailsCache.current.get(payload.new.sender_id);
            
            if (!senderDetails) {
              try {
                const { data } = await supabase
                  .rpc('get_message_sender_details', {
                    sender_id: payload.new.sender_id
                  })
                  .single();

                if (data) {
                  senderDetails = {
                    id: data.id,
                    name: data.name,
                    avatarUrl: data.avatar_url
                  };
                  senderDetailsCache.current.set(payload.new.sender_id, senderDetails);
                }
              } catch (error) {
                console.error('Error fetching sender details:', error);
                return;
              }
            }

            if (!senderDetails) return;

            const formattedMessage: Message = {
              id: payload.new.id,
              content: payload.new.content,
              sender: senderDetails,
              timestamp: new Date(payload.new.created_at),
              channelType: 'group'
            };

            setMessages(prevMessages => {
              const filtered = prevMessages.filter(msg => 
                !msg.id.startsWith('temp-')
              );
              
              if (!filtered.find(msg => msg.id === formattedMessage.id)) {
                return [...filtered, formattedMessage];
              }
              return filtered;
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(messagesChannel);
      };
    }
  }, [channelId, currentUserId]);

  const displayMessages = useCallback(() => {
    const allMessages = [...messages, ...optimisticMessages]
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    let filtered = allMessages;

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
  }, [messages, optimisticMessages, filters, currentUserId]);

  const hasActiveFilters = Boolean(filters.userId || filters.keyword || filters.date);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          {isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowChannelList(true)}
              className="h-9 w-9 p-0"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{channel?.name}</h2>
            {hasActiveFilters && (
              <Badge 
                variant="secondary"
                className="flex items-center gap-1 cursor-pointer hover:bg-secondary/80"
                onClick={onClearFilters}
              >
                <Filter className="h-3 w-3" />
                <span>Filtres actifs</span>
                <X className="h-3 w-3" />
              </Badge>
            )}
          </div>
        </div>
        <ChannelMembersPopover 
          channelId={channelId} 
          channelName={channel?.name || ''} 
          channelType={(channel?.channel_type || 'group') as 'group' | 'direct'} 
          userRole="interpreter"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-3 relative">
        {isLoading ? (
          <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm flex items-center justify-center">
            <p className="text-lg font-semibold">Chargement des messages...</p>
          </div>
        ) : !isSubscribed ? (
          <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm flex items-center justify-center">
            <p className="text-lg font-semibold">
              Connexion en cours...
            </p>
          </div>
        ) : null}
        <MessageList
          messages={displayMessages()}
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
      />
    </div>
  );
};
