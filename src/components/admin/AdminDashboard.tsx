
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { MessagesTab } from "./MessagesTab";
import { UserManagement } from "./UserManagement";
import { MissionManagement } from "./MissionManagement";

interface AdminDashboardProps {
  sendTestNotification?: (interpreterId: string) => Promise<void>;
  isSendingTest?: boolean;
}

export const AdminDashboard = ({ sendTestNotification, isSendingTest }: AdminDashboardProps) => {
  return (
    <Tabs defaultValue="users" className="space-y-4">
      <TabsList>
        <TabsTrigger value="users">Utilisateurs</TabsTrigger>
        <TabsTrigger value="missions">Missions</TabsTrigger>
        <TabsTrigger value="messages">Messages</TabsTrigger>
      </TabsList>
      <TabsContent value="users" className="space-y-4">
        <Card className="p-4">
          <UserManagement sendTestNotification={sendTestNotification} isSendingTest={isSendingTest} />
        </Card>
      </TabsContent>
      <TabsContent value="missions">
        <Card className="p-4">
          <MissionManagement />
        </Card>
      </TabsContent>
      <TabsContent value="messages">
        <Card className="p-4">
          <MessagesTab />
        </Card>
      </TabsContent>
    </Tabs>
  );
};
