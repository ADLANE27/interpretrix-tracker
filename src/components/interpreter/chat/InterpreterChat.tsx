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
import { StatusManager } from "@/components/interpreter/StatusManager";
import { Menu, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Profile } from "@/types/profile";

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
  const isMobile = useIsMobile();
  const messageContainerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (channelId) {
      console.log('[InterpreterChat] Marking mentions as read for channel:', channelId);
      markMentionsAsRead();
    }
  }, [channelId, markMentionsAsRead]);

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
              console.log('[InterpreterChat] New mention received:', payload.new);
              
              try {
                await playNotificationSound();
              } catch (error) {
                console.error('[InterpreterChat] Error playing sound:', error);
              }
              
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
        .subscribe((status) => {
          console.log(`[InterpreterChat] Mention subscription status:`, status);
        });

      return () => {
        console.log('[InterpreterChat] Cleaning up mention subscription');
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
    <div className="flex flex-col h-full">
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm flex flex-col px-3 md:px-6 sticky top-0 z-40 safe-area-top">
        <div className="h-[56px] md:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isMobile && onBackToChannels && (
              <Button variant="ghost" size="icon" className="-ml-1" onClick={onBackToChannels}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            {isMobile && onMenuClick && (
              <Button variant="ghost" size="icon" className="-ml-1" onClick={onMenuClick}>
                <Menu className="h-5 w-5" />
              </Button>
            )}
          </div>
          
          <h2 className="text-lg font-semibold truncate flex-1 text-center md:text-left">{channel?.name}</h2>
          
          <ChannelMembersPopover 
            channelId={channelId} 
            channelName={channel?.name || ''} 
            channelType={(channel?.channel_type || 'group') as 'group' | 'direct'} 
            userRole="interpreter"
          />
        </div>
        
        {profile && isMobile && (
          <div className="pb-3 w-full overflow-visible">
            <StatusManager 
              currentStatus={profile?.status}
              onStatusChange={onStatusChange} 
            />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-x-none relative" ref={messageContainerRef} id="messages-container" data-channel-id={channelId}>
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
      />
    </div>
  );
};
