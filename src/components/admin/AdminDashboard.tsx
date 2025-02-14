
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessagesTab } from "./MessagesTab";
import { MissionManagement } from "./MissionManagement";
import { UserManagement } from "./UserManagement";
import { AdminList } from "./AdminList";
import { HowToUseGuide } from "@/components/interpreter/HowToUseGuide";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export const AdminDashboard = () => {
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const { toast } = useToast();

  const { data: admins = [], refetch } = useQuery({
    queryKey: ['admins'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          active,
          users:user_id (
            email,
            raw_user_meta_data
          )
        `)
        .eq('role', 'admin');

      if (error) throw error;

      return data.map((admin) => ({
        id: admin.user_id,
        email: admin.users.email,
        first_name: admin.users.raw_user_meta_data?.first_name || '',
        last_name: admin.users.raw_user_meta_data?.last_name || '',
        active: admin.active
      }));
    }
  });

  const handleToggleStatus = async (userId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ active: !currentActive })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Statut mis à jour",
        description: `L'administrateur a été ${!currentActive ? "activé" : "désactivé"}`,
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut: " + error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId }
      });

      if (error) throw error;

      toast({
        title: "Administrateur supprimé",
        description: "L'administrateur a été supprimé avec succès",
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'administrateur: " + error.message,
        variant: "destructive",
      });
    }
  };

  const handleResetPassword = async (userId: string) => {
    try {
      const { error } = await supabase.functions.invoke('reset-user-password', {
        body: { userId }
      });

      if (error) throw error;

      toast({
        title: "Email envoyé",
        description: "Un email de réinitialisation a été envoyé à l'administrateur",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer l'email de réinitialisation: " + error.message,
        variant: "destructive",
      });
    }
  };

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
          <AdminList 
            admins={admins}
            onToggleStatus={handleToggleStatus}
            onDeleteUser={handleDeleteUser}
            onResetPassword={handleResetPassword}
          />
        </TabsContent>
      </Tabs>

      <HowToUseGuide 
        isOpen={isGuideOpen}
        onOpenChange={setIsGuideOpen}
      />
    </div>
  );
};
