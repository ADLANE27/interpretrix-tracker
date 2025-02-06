import { useState } from "react";
import { MessagingContainer } from "./messaging/MessagingContainer";
import { ChannelList } from "./ChannelList";

export const MessagesTab = () => {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  const handleChannelSelect = (channelId: string) => {
    setSelectedChannelId(channelId);
  };

  return (
    <div className="grid grid-cols-[300px_1fr] gap-4 h-[calc(100vh-16rem)]">
      <div className="relative">
        <ChannelList onChannelSelect={handleChannelSelect} />
      </div>
      {selectedChannelId ? (
        <MessagingContainer channelId={selectedChannelId} />
      ) : (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          Select a channel to start chatting
        </div>
      )}
    </div>
  );
};