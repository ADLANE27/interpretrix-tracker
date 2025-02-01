import { useState } from "react";
import { ChannelList } from "./ChannelList";
import { CreateChannelDialog } from "./CreateChannelDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const MessagingTab = () => {
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Messages</h2>
        <Button onClick={() => setIsCreateChannelOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Channel
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <ChannelList />
        </div>
        <div className="lg:col-span-3 bg-white rounded-lg shadow p-6 min-h-[600px]">
          <div className="text-center text-gray-500">
            Select a channel to start messaging
          </div>
        </div>
      </div>

      <CreateChannelDialog
        open={isCreateChannelOpen}
        onOpenChange={setIsCreateChannelOpen}
      />
    </div>
  );
};