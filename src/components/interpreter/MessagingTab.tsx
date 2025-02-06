import { useState } from "react";
import { Card } from "@/components/ui/card";
import { InterpreterChannelList } from "./chat/InterpreterChannelList";
import { InterpreterChat } from "./chat/InterpreterChat";

export const MessagingTab = () => {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="p-4 md:col-span-1">
        <InterpreterChannelList 
          onChannelSelect={setSelectedChannelId}
        />
      </Card>
      
      {selectedChannelId && (
        <Card className="p-4 md:col-span-2">
          <InterpreterChat channelId={selectedChannelId} />
        </Card>
      )}
    </div>
  );
};