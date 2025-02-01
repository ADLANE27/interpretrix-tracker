import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DirectMessaging } from "./DirectMessaging";
import { TeamChat } from "./TeamChat";

export const AdminMessaging = () => {
  return (
    <Tabs defaultValue="direct" className="space-y-4">
      <TabsList>
        <TabsTrigger value="direct">Direct Messages</TabsTrigger>
        <TabsTrigger value="team">Team Chat</TabsTrigger>
      </TabsList>

      <TabsContent value="direct">
        <DirectMessaging />
      </TabsContent>

      <TabsContent value="team">
        <TeamChat />
      </TabsContent>
    </Tabs>
  );
};