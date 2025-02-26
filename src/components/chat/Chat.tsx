import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { supabase } from "@/integrations/supabase/client";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { ChannelMembersPopover } from "./ChannelMembersPopover";
import { useUserRole } from "@/hooks/use-user-role";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

interface ChatProps {
  channelId: string;
}

const Chat = ({ channelId }: ChatProps) => {
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
  const [newName, setNewName] = useState(channel?.name || '');
  const userRole = useUserRole();

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

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          {channel?.channel_type === 'group' && userRole === 'admin' && isEditing ? (
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
                  setNewName(channel.name);
                }}
              >
                Annuler
              </Button>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold">{channel?.name}</h2>
              {channel?.channel_type === 'group' && userRole === 'admin' && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsEditing(true);
                    setNewName(channel.name);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
        </div>
        <ChannelMembersPopover 
          channelId={channelId} 
          channelName={channel?.name || ''} 
          channelType={channel?.channel_type || 'group'} 
          userRole={userRole || 'interpreter'}
        />
      </div>
      
      <MessageList channelId={channelId} />
      <ChatInput channelId={channelId} />
    </div>
  );
};

export default Chat;
