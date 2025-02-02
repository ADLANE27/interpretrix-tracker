import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users } from "lucide-react";

interface Channel {
  id: string;
  name: string;
  members_count: number;
}

interface ChannelListProps {
  channels: Channel[];
  selectedChannel: string | null;
  onSelectChannel: (channelId: string) => void;
}

export const ChannelList = ({
  channels,
  selectedChannel,
  onSelectChannel,
}: ChannelListProps) => {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-foreground px-2">Canaux</h3>
      {channels.map((channel) => (
        <Button
          key={channel.id}
          variant={selectedChannel === channel.id ? "secondary" : "ghost"}
          className="w-full justify-start text-left"
          onClick={() => onSelectChannel(channel.id)}
        >
          <Users className="h-4 w-4 mr-2" />
          <div className="flex flex-col items-start">
            <span className="text-foreground">{channel.name}</span>
            <span className="text-xs text-muted-foreground">
              {channel.members_count} membres
            </span>
          </div>
        </Button>
      ))}
    </div>
  );
};