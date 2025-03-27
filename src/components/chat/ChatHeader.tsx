
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChannelMembersPopover } from "@/components/chat/ChannelMembersPopover";
import { RefreshCw, Users, Pencil } from "lucide-react";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ChatHeaderProps {
  channel: any;
  channelId: string;
  userRole?: 'admin' | 'interpreter';
  forceFetch: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  channel,
  channelId,
  userRole = 'admin',
  forceFetch
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(channel?.name || '');
  const { toast } = useToast();

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
                  className="rounded-full" 
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
            <Button variant="ghost" size="icon" className="rounded-full">
              <Users className="h-5 w-5" />
            </Button>
          </ChannelMembersPopover>
        </div>
      </div>
    </motion.div>
  );
};
