
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Edit2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { RemoveMemberDialog } from "./channel-members/RemoveMemberDialog";
import { UserSearch } from "./channel-members/UserSearch";
import { MemberList } from "./channel-members/MemberList";
import { AvailableUsersList } from "./channel-members/AvailableUsersList";

interface ChannelMembersPopoverProps {
  channelId: string;
  channelName: string;
  channelType: 'group' | 'direct';
  userRole: 'admin' | 'interpreter';
}

export const ChannelMembersPopover = ({
  channelId,
  channelName,
  channelType,
  userRole
}: ChannelMembersPopoverProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(channelName);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRename = async () => {
    if (!newName.trim() || newName === channelName) {
      setIsEditing(false);
      return;
    }

    try {
      setIsSubmitting(true);

      const { error } = await supabase
        .from('chat_channels')
        .update({ name: newName.trim() })
        .eq('id', channelId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Le nom du canal a été mis à jour"
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error renaming channel:', error);
      toast({
        title: "Erreur",
        description: "Impossible de renommer le canal",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Users className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold">
                {channelType === 'group' ? 'Membres du canal' : 'Conversation'}
              </h4>
              {channelType === 'group' && (
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="h-7 text-sm"
                        placeholder="Nom du canal"
                        disabled={isSubmitting}
                      />
                      <Button
                        size="sm"
                        className="h-7"
                        onClick={handleRename}
                        disabled={isSubmitting}
                      >
                        Sauvegarder
                      </Button>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">{channelName}</p>
                      {userRole === 'admin' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setIsEditing(true)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <MemberList
            channelId={channelId}
            channelType={channelType}
            userRole={userRole}
          />

          {userRole === 'admin' && channelType === 'group' && (
            <>
              <div className="pt-4">
                <h4 className="mb-4 text-sm font-semibold">Ajouter des membres</h4>
                <AvailableUsersList channelId={channelId} />
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
