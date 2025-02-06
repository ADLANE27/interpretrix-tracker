import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ChannelList } from "./ChannelList";
import { ChannelMemberManagement } from "./ChannelMemberManagement";
import { CreateChannelDialog } from "./CreateChannelDialog";

export const MessagesTab = () => {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="p-4 md:col-span-1">
        <ChannelList
          onChannelSelect={setSelectedChannelId}
          selectedChannelId={selectedChannelId}
        />
      </Card>
      
      {selectedChannelId && (
        <Card className="p-4 md:col-span-2">
          <ChannelMemberManagement channelId={selectedChannelId} />
        </Card>
      )}
      
      <CreateChannelDialog />
    </div>
  );
};