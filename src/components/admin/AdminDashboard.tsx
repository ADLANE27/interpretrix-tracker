
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessagesTab } from "./MessagesTab";
import { MissionManagement } from "./MissionManagement";
import { UserManagement } from "./UserManagement";
import { AdminList } from "./AdminList";
import { HowToUseGuide } from "@/components/interpreter/HowToUseGuide";

export const AdminDashboard = () => {
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  return (
    <div className="space-y-4">
      <Tabs defaultValue="messages" className="space-y-4">
        <TabsList>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="missions">Missions</TabsTrigger>
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          <TabsTrigger value="admins">Administrateurs</TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="space-y-4">
          <MessagesTab />
        </TabsContent>

        <TabsContent value="missions">
          <MissionManagement />
        </TabsContent>

        <TabsContent value="users">
          <UserManagement />
        </TabsContent>

        <TabsContent value="admins">
          <AdminList />
        </TabsContent>
      </Tabs>

      <HowToUseGuide 
        isOpen={isGuideOpen}
        onOpenChange={setIsGuideOpen}
      />
    </div>
  );
};
