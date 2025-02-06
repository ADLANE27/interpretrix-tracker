import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessagesTab } from "@/components/chat/MessagesTab";
import { UsersTab } from "@/components/admin/UsersTab";
import { ChannelList } from "@/components/shared/ChannelList";

export const AdminDashboard = () => {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  const handleChannelSelect = (channelId: string) => {
    setSelectedChannelId(channelId);
  };

  return (
    <div className="container mx-auto py-6">
      <Tabs defaultValue="messages" className="w-full">
        <TabsList>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
        </TabsList>
        <TabsContent value="messages">
          <MessagesTab />
        </TabsContent>
        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};