
import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ChannelMembersPopover } from "../ChannelMembersPopover";

interface ChannelHeaderProps {
  channelId: string;
  channelName: string | undefined;
  channelType: 'group' | 'direct';
  userRole: 'admin' | 'interpreter';
}

export const ChannelHeader: React.FC<ChannelHeaderProps> = ({ 
  channelId, 
  channelName = '', 
  channelType, 
  userRole 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(channelName);

  // Update name state when channel changes
  useEffect(() => {
    if (channelName) {
      setNewName(channelName);
    }
  }, [channelName]);

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
    <div className="flex items-center justify-between px-4 py-3 shadow-sm bg-white">
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
                setNewName(channelName || '');
              }}
            >
              Annuler
            </Button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{channelName}</h2>
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
        channelName={channelName || ''} 
        channelType={channelType} 
        userRole={userRole}
      />
    </div>
  );
};
