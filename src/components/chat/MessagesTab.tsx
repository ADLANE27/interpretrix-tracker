import { useState } from "react";
import { ChatWindow } from "./ChatWindow";
import { ChannelList } from "./ChannelList";
import { useChat } from "@/hooks/useChat";

export const MessagesTab = () => {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const { messages, sendMessage, isLoading } = useChat(selectedChannelId || '');

  return (
    <div className="grid grid-cols-[300px_1fr] gap-4 h-[600px]">
      <ChannelList onChannelSelect={setSelectedChannelId} />
      {selectedChannelId ? (
        <ChatWindow
          messages={messages}
          onSendMessage={sendMessage}
          isLoading={isLoading}
        />
      ) : (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          Sélectionnez un canal pour commencer à discuter
        </div>
      )}
    </div>
  );
};