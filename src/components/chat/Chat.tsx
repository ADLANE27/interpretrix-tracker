
import React, { useState, useEffect } from 'react';
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

  // Debug logging to check channel data
  console.log('Channel data:', channel);
  console.log('User role:', userRole);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
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
              <h2 className="text-lg font-semibold">{channel?.name}</h2>
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
      
      <div className="flex-1 overflow-y-auto">
        <MessageList
          messages={messages}
          currentUserId={currentUserId}
          onDeleteMessage={deleteMessage}
          onReactToMessage={reactToMessage}
          channelId={channelId}
        />
      </div>
      
      <ChatInput
        message=""
        setMessage={() => {}}
        onSendMessage={() => {}}
        handleFileChange={() => {}}
        attachments={[]}
        handleRemoveAttachment={() => {}}
        inputRef={React.createRef()}
        replyTo={null}
        setReplyTo={() => {}}
      />
    </div>
  );
};

export default Chat;
