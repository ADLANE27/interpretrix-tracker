import { useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { useMessages } from "../hooks/useMessages";
import { ThreadView } from "./ThreadView";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface ChannelMessagesProps {
  channelId: string;
  channelName?: string;
}

export const ChannelMessages = ({ channelId, channelName }: ChannelMessagesProps) => {
  const { messages, isLoading, sendMessage } = useMessages(channelId);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSendMessage = async (content: string) => {
    try {
      await sendMessage(content);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive",
      });
    }
  };

  const handleReply = (messageId: string) => {
    setSelectedThreadId(messageId);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] bg-white">
      <div className="px-6 py-4 border-b">
        <h2 className="text-lg font-semibold">#{channelName}</h2>
      </div>

      <div className="flex-1 flex">
        <div className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 h-full">
            <div className="p-4 space-y-4">
              {isLoading ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                </div>
              ) : messages && messages.length > 0 ? (
                <MessageList
                  messages={messages}
                  selectedInterpreter={channelId}
                  editingMessage={null}
                  editContent=""
                  onEditStart={() => {}}
                  onEditCancel={() => {}}
                  onEditSave={() => {}}
                  onEditChange={() => {}}
                  onDeleteMessage={() => {}}
                />
              ) : (
                <div className="text-center text-gray-500 py-4">
                  Aucun message dans ce canal
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t bg-chat-input">
            <MessageInput
              value=""
              onChange={() => {}}
              onSend={handleSendMessage}
              isLoading={false}
            />
          </div>
        </div>

        {selectedThreadId && (
          <ThreadView
            parentMessage={{
              id: selectedThreadId,
              content: messages.find(m => m.id === selectedThreadId)?.content || "",
              created_at: messages.find(m => m.id === selectedThreadId)?.created_at || "",
            }}
            onClose={() => setSelectedThreadId(null)}
          />
        )}
      </div>
    </div>
  );
};