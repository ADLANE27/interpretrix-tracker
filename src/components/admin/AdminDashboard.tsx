import { useState } from "react";
import { MessagingContainer } from "@/components/chat/messaging/MessagingContainer";
import { ChannelList } from "@/components/chat/ChannelList";

export const AdminDashboard = () => {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  return (
    <div className="container mx-auto p-6">
      <div className="grid grid-cols-[300px_1fr] gap-4">
        <ChannelList onChannelSelect={setSelectedChannelId} />
        {selectedChannelId ? (
          <MessagingContainer channelId={selectedChannelId} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Sélectionnez un canal pour commencer à discuter
          </div>
        )}
      </div>
    </div>
  );
};