import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MissionsTab } from "./interpreter/MissionsTab";
import { InterpreterProfile } from "./interpreter/InterpreterProfile";
import { StatusManager } from "./interpreter/StatusManager";
import { NotificationPermission } from "./interpreter/NotificationPermission";
import { Button } from "./ui/button";
import { LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export const InterpreterDashboard = () => {
  const [activeTab, setActiveTab] = useState("missions");
  const [currentStatus, setCurrentStatus] = useState("available");
  const [interpreterId, setInterpreterId] = useState<string>("");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setInterpreterId(user.id);
      }
    };
    getCurrentUser();
  }, []);

  const handleStatusChange = (status: string) => {
    setCurrentStatus(status);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Déconnexion réussie",
        description: "Vous avez été déconnecté avec succès",
      });
      navigate("/login");
    } catch (error) {
      console.error('Error logging out:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la déconnexion",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tableau de bord interprète</h1>
        <Button 
          variant="outline"
          onClick={handleLogout}
          className="gap-2"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </Button>
      </div>

      <div className="space-y-6">
        <StatusManager 
          currentStatus={currentStatus} 
          onStatusChange={handleStatusChange}
        />
        <NotificationPermission interpreterId={interpreterId} />
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="missions">Missions</TabsTrigger>
            <TabsTrigger value="profile">Profil</TabsTrigger>
          </TabsList>

          <TabsContent value="missions">
            <MissionsTab />
          </TabsContent>

          <TabsContent value="profile">
            <InterpreterProfile />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};