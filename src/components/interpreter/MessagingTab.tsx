import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ChannelList } from "@/components/chat/ChannelList";
import { Chat } from "@/components/chat/Chat";

export const MessagingTab = () => {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="p-4 md:col-span-1">
        <ChannelList 
          onChannelSelect={setSelectedChannelId}
        />
      </Card>
      
      {selectedChannelId && (
        <Card className="p-4 md:col-span-2">
          <Chat channelId={selectedChannelId} />
        </Card>
      )}
    </div>
  );
};