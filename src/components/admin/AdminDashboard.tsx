import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessagesTab } from "@/components/chat/MessagesTab";
import { UserManagement } from "./UserManagement";
import { MissionManagement } from "./MissionManagement";
import { AdminGuideContent } from "./AdminGuideContent";

export const AdminDashboard = () => {
  const [selectedTab, setSelectedTab] = useState<string>("missions");

  return (
    <div className="container mx-auto py-6">
      <Card className="p-6">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="missions">Missions</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="users">Utilisateurs</TabsTrigger>
            <TabsTrigger value="guide">Guide</TabsTrigger>
          </TabsList>

          <TabsContent value="missions" className="mt-6">
            <MissionManagement />
          </TabsContent>

          <TabsContent value="messages" className="mt-6">
            <MessagesTab />
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <UserManagement />
          </TabsContent>

          <TabsContent value="guide" className="mt-6">
            <AdminGuideContent />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};