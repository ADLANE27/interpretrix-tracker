import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminList } from "@/components/admin/AdminList";
import { InterpreterList } from "@/components/admin/InterpreterList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const UsersTab = () => {
  const [selectedTab, setSelectedTab] = useState<string>("interpreters");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestion des utilisateurs</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="interpreters">Interprètes</TabsTrigger>
            <TabsTrigger value="admins">Administrateurs</TabsTrigger>
          </TabsList>
          <TabsContent value="interpreters">
            <InterpreterList />
          </TabsContent>
          <TabsContent value="admins">
            <AdminList />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};