
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Users, Pencil } from "lucide-react";
import { MemberList } from './channel-members/MemberList';
import { AvailableUsersList } from './channel-members/AvailableUsersList';
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ChannelMembersPopoverProps {
  channelId: string;
  channelName: string;
  channelType: 'group' | 'direct';
  userRole: 'admin' | 'interpreter';
}

export const ChannelMembersPopover: React.FC<ChannelMembersPopoverProps> = ({
  channelId,
  channelName,
  channelType,
  userRole,
}) => {
  const isMobile = useIsMobile();
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(channelName);
  const [isOpen, setIsOpen] = useState(false);

  // Debug log
  console.log('ChannelMembersPopover props:', { channelId, channelName, channelType, userRole });

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
    <div className="flex items-center gap-2">
      {/* Show the rename button for admins */}
      {userRole === 'admin' && channelType === 'group' && !isEditing && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsEditing(true)}
          className="p-2 h-8 w-8"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      )}

      {/* Show the rename input for admins when editing */}
      {userRole === 'admin' && channelType === 'group' && isEditing && (
        <div className="flex items-center gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-[200px]"
            placeholder="Nom du canal"
          />
          <Button size="sm" onClick={handleRename}>
            Sauvegarder
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => {
              setIsEditing(false);
              setNewName(channelName);
            }}
          >
            Annuler
          </Button>
        </div>
      )}

      {/* Only show participants button for admin users */}
      {userRole === 'admin' && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm"
              className="whitespace-nowrap"
            >
              <Users className="h-4 w-4 mr-2" />
              {!isMobile && "Participants"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" align="end">
            <div className="space-y-4">
              <h3 className="font-semibold">{channelName}</h3>

              <MemberList 
                channelId={channelId}
                channelType={channelType}
                userRole={userRole}
              />
              
              {userRole === 'admin' && channelType === 'group' && (
                <>
                  <div className="h-px bg-border" />
                  <AvailableUsersList channelId={channelId} />
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};
