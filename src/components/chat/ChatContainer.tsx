
import React, { useState, useRef } from 'react';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UnifiedMessageList } from "./UnifiedMessageList";
import { ChatInput } from "./ChatInput";
import { ChannelMembersPopover } from "./ChannelMembersPopover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { useChat } from "@/hooks/useChat";
import { useToast } from "@/hooks/use-toast";
import { Message } from "@/types/messaging";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatContainerProps {
  channelId: string;
  userRole?: 'admin' | 'interpreter';
  filters?: {
    userId?: string;
    keyword?: string;
    date?: Date;
  };
}

export const ChatContainer: React.FC<ChatContainerProps> = ({ 
  channelId, 
  userRole = 'admin',
  filters = {}
}) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Fetch channel data
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
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // UI state
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [message, setMessage] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize channel name when data is loaded
  React.useEffect(() => {
    if (channel?.name) {
      setNewName(channel.name);
    }
  }, [channel?.name]);

  // Get chat functionality from the hook
  const {
    messages: allMessages,
    isLoading,
    sendMessage,
    deleteMessage,
    currentUserId,
    reactToMessage
  } = useChat(channelId);

  // Apply filters if provided
  const messages = React.useMemo(() => {
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
  }, [allMessages, filters, currentUserId]);

  // Handle channel renaming
  const handleRename = async () => {
    if (!newName.trim()) return;
    
    try {
      const { error } = await supabase
        .from('chat_channels')
        .update({ name: newName.trim() })
        .eq('id', channelId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['channel', channelId] });
      
      toast({
        title: "Success",
        description: "Channel has been renamed",
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error renaming channel:', error);
      toast({
        title: "Error",
        description: "Could not rename the channel",
        variant: "destructive",
      });
    }
  };

  // Handle message sending
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

  // Handle file attachments
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    
    const fileArray = Array.from(files);
    setAttachments(prev => [...prev, ...fileArray]);
  };

  // Handle attachment removal
  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => {
      const newAttachments = [...prev];
      newAttachments.splice(index, 1);
      return newAttachments;
    });
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex items-center justify-between p-4 border-b shrink-0">
        <div className="flex items-center gap-2">
          {isEditing && userRole === 'admin' ? (
            <>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-[200px]"
              />
              <Button size="sm" onClick={handleRename}>
                Save
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => {
                  setIsEditing(false);
                  setNewName(channel?.name || '');
                }}
              >
                Cancel
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold truncate">{channel?.name || 'Loading...'}</h2>
              {userRole === 'admin' && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="p-2 h-8 w-8"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
        <ChannelMembersPopover 
          channelId={channelId} 
          channelName={channel?.name || ''} 
          channelType={(channel?.channel_type || 'group') as 'group' | 'direct'} 
          userRole={userRole}
        />
      </div>
      
      <div className="flex-1 w-full overflow-hidden">
        <ScrollArea className="h-full pr-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-gray-500 mt-10">
              Loading messages...
            </div>
          ) : (
            <UnifiedMessageList
              messages={messages}
              currentUserId={currentUserId}
              onDeleteMessage={deleteMessage}
              onReactToMessage={reactToMessage}
              replyTo={replyTo}
              setReplyTo={setReplyTo}
              channelId={channelId}
            />
          )}
        </ScrollArea>
      </div>
      
      <div className="w-full bg-white border-t">
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
    </div>
  );
};
