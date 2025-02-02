import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, X } from "lucide-react";
import { useThread } from "../hooks/useThread";

interface ThreadViewProps {
  parentMessage: {
    id: string;
    content: string;
    sender_name: string;
    created_at: string;
  };
  onClose: () => void;
}

export const ThreadView = ({ parentMessage, onClose }: ThreadViewProps) => {
  const [newReply, setNewReply] = useState("");
  const { replies, isLoading, sendReply } = useThread(parentMessage.id);

  const handleSendReply = async () => {
    const success = await sendReply(newReply);
    if (success) {
      setNewReply("");
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center p-4 border-b">
        <h3 className="text-lg font-semibold">Thread</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 border-b bg-secondary/20">
        <div className="text-sm font-medium">{parentMessage.sender_name}</div>
        <div className="mt-1">{parentMessage.content}</div>
        <div className="text-xs text-gray-500 mt-1">
          {new Date(parentMessage.created_at).toLocaleString()}
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {replies.map((reply) => (
            <div key={reply.id} className="space-y-1">
              <div className="text-sm font-medium">{reply.sender_name}</div>
              <div className="p-3 rounded-lg bg-secondary max-w-[80%]">
                {reply.content}
              </div>
              <div className="text-xs text-gray-500">
                {new Date(reply.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={newReply}
            onChange={(e) => setNewReply(e.target.value)}
            placeholder="Reply to thread..."
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendReply();
              }
            }}
          />
          <Button onClick={handleSendReply} disabled={isLoading}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};