import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChannelList } from "./ChannelList";
import { CreateChannelDialog } from "./CreateChannelDialog";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { ChannelManagement } from "./ChannelManagement";

export const MessagingTab = () => {
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="messages">
        <TabsList>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="channels">Channel Management</TabsTrigger>
        </TabsList>

        <TabsContent value="messages">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <ChannelList onChannelSelect={setSelectedChannelId} />
            </div>
            <div className="lg:col-span-3 bg-white rounded-lg shadow">
              {selectedChannelId ? (
                <div className="flex flex-col h-[600px]">
                  <MessageList channelId={selectedChannelId} />
                  <MessageInput channelId={selectedChannelId} />
                </div>
              ) : (
                <div className="h-[600px] flex items-center justify-center text-gray-500">
                  Select a channel to start messaging
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="channels">
          <ChannelManagement />
        </TabsContent>
      </Tabs>

      <CreateChannelDialog
        open={isCreateChannelOpen}
        onOpenChange={setIsCreateChannelOpen}
      />
    </div>
  );
};