
import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { ChannelMembersPopover } from "./ChannelMembersPopover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { useChat } from "@/hooks/useChat";
import { toast } from "@/hooks/use-toast";
import { Message } from "@/types/messaging";
import { ScrollArea } from "@/components/ui/scroll-area";

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

  // Update newName when channel data is loaded
  useEffect(() => {
    if (channel?.name) {
      setNewName(channel.name);
    }
  }, [channel?.name]);

  const {
    messages,
    isLoading,
    sendMessage,
    deleteMessage,
    currentUserId,
    reactToMessage
  } = useChat(channelId);

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
    if (!message.trim() || !channelId || !currentUserId) return;
    
    try {
      await sendMessage(message, replyTo?.id, attachments);
      setMessage('');
      setAttachments([]);
      setReplyTo(null);
    } catch (error) {
      console.error('Error sending message:', error);
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
            </>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold truncate">{channel?.name}</h2>
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
        {isLoading ? (
          <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm flex items-center justify-center">
            <p className="text-lg font-semibold">Chargement des messages...</p>
          </div>
        ) : (
          <ScrollArea className="h-full pr-2">
            <MessageList
              messages={messages}
              currentUserId={currentUserId}
              onDeleteMessage={deleteMessage}
              onReactToMessage={reactToMessage}
              replyTo={replyTo}
              setReplyTo={setReplyTo}
              channelId={channelId}
            />
          </ScrollArea>
        )}
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

export default Chat;
