import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreateChannelDialog } from "../CreateChannelDialog";
import { ChannelListItem } from "./ChannelListItem";
import { useChannels } from "@/hooks/chat/useChannels";
import { useUnreadMentions } from "@/hooks/chat/useUnreadMentions";
import { useState } from "react";

interface ChannelListProps {
  onChannelSelect: (channelId: string) => void;
}

export const ChannelList = ({ onChannelSelect }: ChannelListProps) => {
  const { channels, selectedChannelId, setSelectedChannelId, isAdmin } = useChannels();
  const { unreadMentions } = useUnreadMentions();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const handleChannelSelect = (channelId: string) => {
    setSelectedChannelId(channelId);
    onChannelSelect(channelId);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Canaux de discussion</h2>
        {isAdmin && (
          <Button onClick={() => setIsCreateDialogOpen(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Nouveau canal
          </Button>
        )}
      </div>

      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-2">
          {channels.map((channel) => (
            <ChannelListItem
              key={channel.id}
              channel={channel}
              isSelected={selectedChannelId === channel.id}
              unreadCount={unreadMentions[channel.id]}
              onClick={() => handleChannelSelect(channel.id)}
            />
          ))}
        </div>
      </ScrollArea>

      {isCreateDialogOpen && (
        <CreateChannelDialog
          isOpen={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
        />
      )}
    </div>
  );
};