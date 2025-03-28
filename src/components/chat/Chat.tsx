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
import { Pencil, Users, RefreshCw, AtSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ChatProps {
  channelId: string;
  userRole?: 'admin' | 'interpreter';
  messageListHeight?: string;
}

const Chat = ({ 
  channelId, 
  userRole = 'admin', 
  messageListHeight = "calc(100vh - 300px)" // Default adjusted to account for header and footer
}: ChatProps) => {
  const { data: channel, isLoading: isChannelLoading } = useQuery({
    queryKey: ['channel', channelId],
    queryFn: async () => {
      if (!channelId) {
        return null;
      }
      
      const { data, error } = await supabase
        .from('chat_channels')
        .select('*')
        .eq('id', channelId)
        .single();
      
      if (error) throw error;
      return data;
    },
    retry: 1, // Retry only once to prevent excessive retries
    staleTime: 60000, // Cache for 1 minute
    enabled: !!channelId
  });

  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [message, setMessage] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const messageListKey = useRef<number>(0);
  const isMobile = useIsMobile();
  const orientation = useOrientation();
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isMessageLoadingTimedOut, setIsMessageLoadingTimedOut] = useState(false);

  useEffect(() => {
    if (channel?.name) {
      setNewName(channel.name);
    }
  }, [channel?.name]);

  const {
    messages,
    isLoading: isMessagesLoading,
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
  const { toast } = useToast();

  useEffect(() => {
    if (isMessagesLoading) {
      loadingTimeoutRef.current = setTimeout(() => {
        setIsMessageLoadingTimedOut(true);
      }, 10000);
    } else {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      setIsMessageLoadingTimedOut(false);
    }
    
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [isMessagesLoading]);

  useEffect(() => {
    if (channelId) {
      markMentionsAsRead();
    }
  }, [channelId, markMentionsAsRead]);

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        console.log(`[Chat ${userRole}] Forcing message sync`);
        forceFetch();
      }
    }, 120000); // Sync every 2 minutes (increased from 1 minute)
    
    return () => clearInterval(syncInterval);
  }, [forceFetch, userRole]);

  useEffect(() => {
    messageListKey.current += 1;
  }, [channelId]);

  useEffect(() => {
    if (messageContainerRef.current && autoScrollEnabled) {
      const container = messageContainerRef.current;
      
      requestAnimationFrame(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      });
    }
  }, [messages, autoScrollEnabled]);

  const handleRename = async () => {
    if (!newName.trim()) return;
    
    try {
      const { error } = await supabase
        .from('chat_channels')
        .update({ name: newName.trim() })
        .eq('id', channelId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Le canal a été renommé",
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error renaming channel:', error);
      toast({
        title: "Erreur",
        description: "Impossible de renommer le canal",
        variant: "destructive",
      });
    }
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

  const showLoading = (isMessagesLoading || isChannelLoading) && !isMessageLoadingTimedOut;

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
            <motion.h2 
              className="text-lg font-semibold truncate flex-1 text-gradient-primary"
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              {isEditing ? (
                <>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleRename();
                      } else if (e.key === 'Escape') {
                        setIsEditing(false);
                        setNewName(channel?.name || '');
                      }
                    }}
                    className="w-[200px] bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-gray-200/70 dark:border-gray-700/70 focus-within:ring-1 focus-within:ring-primary/30"
                    autoFocus
                  />
                  <div className="flex gap-2 mt-1">
                    <Button size="sm" onClick={handleRename} className="shadow-sm">
                      Sauvegarder
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => {
                        setIsEditing(false);
                        setNewName(channel?.name || '');
                      }}
                      className="hover:bg-gray-100/50 dark:hover:bg-gray-800/50"
                    >
                      Annuler
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {channel?.name || 'Chargement...'}
                  {userRole === 'admin' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="ml-2 p-1 h-7 w-7 rounded-full hover:bg-primary/10 transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
            </motion.h2>
          </div>
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
          {showLoading ? (
            <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md flex items-center justify-center">
              <LoadingSpinner size="lg" text="Chargement des messages..." />
            </div>
          ) : isMessageLoadingTimedOut ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="text-amber-600 dark:text-amber-400 mb-2">
                <RefreshCw className="h-8 w-8 animate-spin-slow mx-auto mb-2" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Le chargement prend plus de temps que prévu</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Les messages sont en cours de chargement mais semblent prendre plus de temps que d'habitude.
              </p>
              <Button 
                variant="outline" 
                onClick={forceFetch}
                className="group"
              >
                <RefreshCw className="h-4 w-4 mr-2 group-hover:animate-spin" /> Réessayer
              </Button>
            </div>
          ) : !isSubscribed ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="text-amber-600 dark:text-amber-400 mb-2">
                <RefreshCw className="h-8 w-8 animate-spin-slow mx-auto mb-2" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Connexion en cours...</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Tentative de connexion au service de messagerie en temps réel.
              </p>
              <Button 
                variant="outline" 
                onClick={forceFetch}
                className="group"
              >
                <RefreshCw className="h-4 w-4 mr-2 group-hover:animate-spin" /> Recharger
              </Button>
            </div>
          ) : null}
          
          {hasMoreMessages && !showLoading && (
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
          />
        </div>
      </div>
    </div>
  );
};

export default Chat;
