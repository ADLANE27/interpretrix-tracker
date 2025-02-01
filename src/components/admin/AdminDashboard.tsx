import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { UserManagement } from "./UserManagement";
import { MissionManagement } from "./MissionManagement";
import { AdminMessaging } from "./messaging/AdminMessaging";
import { GroupChatManager } from "./messaging/GroupChatManager";

export const AdminDashboard = () => {
  return (
    <Card className="mt-6">
      <Tabs defaultValue="missions" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="missions">Missions</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="messages">Direct Messages</TabsTrigger>
          <TabsTrigger value="groups">Group Chats</TabsTrigger>
        </TabsList>
        <TabsContent value="missions" className="p-4">
          <MissionManagement />
        </TabsContent>
        <TabsContent value="users" className="p-4">
          <UserManagement />
        </TabsContent>
        <TabsContent value="messages" className="p-4">
          <AdminMessaging />
        </TabsContent>
        <TabsContent value="groups" className="p-4">
          <GroupChatManager />
        </TabsContent>
      </Tabs>
    </Card>
  );
};