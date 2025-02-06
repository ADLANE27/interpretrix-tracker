import { useState } from "react";
import { MessagesContainer } from "./messaging/MessagesContainer";
import { ChannelList } from "./messaging/ChannelList";
import { Badge } from "@/components/ui/badge";
import { useUnreadMentions } from "@/hooks/chat/useUnreadMentions";

export const MessagesTab = () => {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const { unreadMentions } = useUnreadMentions();
  const totalUnreadMentions = Object.values(unreadMentions).reduce((a, b) => a + b, 0);

  const handleChannelSelect = (channelId: string) => {
    setSelectedChannelId(channelId);
  };

  return (
    <div className="grid grid-cols-[300px_1fr] gap-4 h-[calc(100vh-16rem)]">
      <div className="relative">
        <ChannelList onChannelSelect={handleChannelSelect} />
        {totalUnreadMentions > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute top-2 right-2"
          >
            {totalUnreadMentions}
          </Badge>
        )}
      </div>
      {selectedChannelId ? (
        <MessagesContainer 
          key={selectedChannelId} 
          channelId={selectedChannelId} 
        />
      ) : (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          Select a channel to start chatting
        </div>
      )}
    </div>
  );
};