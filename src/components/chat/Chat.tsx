
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
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [message, setMessage] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const messageListKey = useRef<number>(0);
  const isMobile = useIsMobile();
  const orientation = useOrientation();

  useEffect(() => {
    if (channel?.name) {
      setNewName(channel.name);
    }
  }, [channel?.name]);

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

  const { toast } = useToast();

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
    messageListKey.current += 1;
  }, [channelId]);

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  useEffect(() => {
    const syncInterval = setInterval(() => {
      console.log(`[Chat ${userRole}] Forcing message sync`);
      forceFetch();
    }, 60000); // Sync every minute
    
    return () => clearInterval(syncInterval);
  }, [forceFetch, userRole]);

  useEffect(() => {
    if (channelId) {
      markMentionsAsRead();
    }
  }, [channelId, markMentionsAsRead]);

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
    <div className="flex flex-col h-full overflow-hidden">
      <motion.div 
        className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm flex flex-col px-3 md:px-6 sticky top-0 z-40 safe-area-top border-b border-gray-200 dark:border-gray-700 shadow-sm"
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <div className="h-[56px] md:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold truncate flex-1 text-gradient-primary">
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
                    className="w-[200px]"
                    autoFocus
                  />
                  <div className="flex gap-2 mt-1">
                    <Button size="sm" onClick={handleRename}>
                      Sauvegarder
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => {
                        setIsEditing(false);
                        setNewName(channel?.name || '');
                      }}
                    >
                      Annuler
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {channel?.name}
                  {userRole === 'admin' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="ml-2 p-1 h-7 w-7 rounded-full"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
            </h2>
          </div>
          
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors" 
                    onClick={forceFetch}
                    aria-label="Actualiser les messages"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Actualiser les messages</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <ChannelMembersPopover 
              channelId={channelId} 
              channelName={channel?.name || ''} 
              channelType={(channel?.channel_type || 'group') as 'group' | 'direct'} 
              userRole={userRole}
            >
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                <Users className="h-5 w-5" />
              </Button>
            </ChannelMembersPopover>
          </div>
        </div>
      </motion.div>
      
      <div 
        className="flex-1 overflow-y-auto overflow-x-hidden overscroll-x-none relative px-1 py-2 sm:p-3 bg-gradient-to-b from-transparent to-gray-50/50 dark:to-gray-900/30"
        ref={messageContainerRef} 
        id="messages-container" 
        data-channel-id={channelId}
        style={isMobile && orientation === "landscape" ? { maxHeight: 'calc(var(--vh, 1vh) * 100 - 160px)' } : {}}
        onScroll={handleScroll}
      >
        <AnimatePresence>
          {isLoading ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm flex items-center justify-center"
            >
              <LoadingSpinner size="lg" text="Chargement des messages..." />
            </motion.div>
          ) : !isSubscribed ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm flex items-center justify-center"
            >
              <LoadingSpinner size="md" text="Connexion en cours..." />
            </motion.div>
          ) : null}
        </AnimatePresence>
        
        {hasMoreMessages && !isLoading && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center my-3"
          >
            <Button 
              size="sm" 
              variant="outline"
              onClick={loadMoreMessages}
              className="text-xs flex items-center gap-1 shadow-sm hover:shadow transition-all"
            >
              <RefreshCw className="h-3 w-3" />
              Charger plus de messages
            </Button>
          </motion.div>
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
      
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className={`
          border-t border-gray-100 dark:border-gray-800 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md
          shadow-[0_-1px_3px_rgba(0,0,0,0.05)] dark:shadow-[0_-1px_3px_rgba(0,0,0,0.2)]
          ${isMobile && orientation === "landscape" ? "fixed bottom-0 left-0 right-0" : ""}
        `}
      >
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
      </motion.div>
    </div>
  );
};

export default Chat;
