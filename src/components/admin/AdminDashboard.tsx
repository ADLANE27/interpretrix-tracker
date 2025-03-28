import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { MissionManagement } from "./MissionManagement";
import { UserManagement } from "./UserManagement";
import { AdminGuideContent } from "./AdminGuideContent";
import { MessagesTab } from "./MessagesTab";
import { AdminMissionsCalendar } from "./AdminMissionsCalendar";
import { ReservationsTab } from "./reservations/ReservationsTab";
import { useTabPersistence } from "@/hooks/useTabPersistence";
import { TabNavigationPanel } from "./dashboard/TabNavigationPanel";
import { InterpretersTab } from "./dashboard/InterpretersTab";

const AdminDashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const tabs = [
    {
      id: "interpreters",
      label: "Interprètes"
    }, 
    {
      id: "missions",
      label: "Missions"
    }, 
    {
      id: "reservations",
      label: "Réservations"
    }, 
    {
      id: "calendar",
      label: "Calendrier"
    }, 
    {
      id: "messages",
      label: "Messages"
    }, 
    {
      id: "users",
      label: "Utilisateurs"
    }, 
    {
      id: "guide",
      label: "Guide"
    }
  ];
  
  const {
    activeTab,
    setActiveTab
  } = useTabPersistence("interpreters");

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast({
        title: "Déconnexion réussie",
        description: "Vous avez été déconnecté avec succès"
      });
      navigate("/admin/login");
    } catch (error: any) {
      toast({
        title: "Erreur de déconnexion",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1a2844]">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full scroll-smooth">
        <TabNavigationPanel
          tabs={tabs}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onLogout={handleLogout}
          isMenuOpen={isMenuOpen}
          setIsMenuOpen={setIsMenuOpen}
        />

        <div className="flex-1 min-h-0 relative bg-[#1a2844]">
          <TabsContent value="interpreters" className="absolute inset-0 overflow-auto bg-slate-50">
            <InterpretersTab />
          </TabsContent>

          <TabsContent value="missions" className="absolute inset-0 overflow-auto bg-[#1a2844]">
            <div className="min-h-full p-4 sm:p-6 bg-slate-50">
              <MissionManagement />
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="absolute inset-0 overflow-auto bg-[#1a2844]">
            <div className="min-h-full p-4 sm:p-6 bg-slate-50">
              <AdminMissionsCalendar />
            </div>
          </TabsContent>

          <TabsContent value="messages" className="absolute inset-0 overflow-auto bg-[#1a2844]">
            <div className="min-h-full p-4 sm:p-6 bg-slate-50">
              <MessagesTab />
            </div>
          </TabsContent>

          <TabsContent value="users" className="absolute inset-0 overflow-auto bg-[#1a2844]">
            <div className="min-h-full p-4 sm:p-6 bg-slate-50">
              <UserManagement />
            </div>
          </TabsContent>

          <TabsContent value="reservations" className="absolute inset-0 overflow-auto bg-[#1a2844]">
            <div className="min-h-full p-4 sm:p-6 bg-slate-50">
              <ReservationsTab />
            </div>
          </TabsContent>

          <TabsContent value="guide" className="absolute inset-0 overflow-auto bg-[#1a2844]">
            <div className="min-h-full p-4 sm:p-6 bg-slate-50">
              <AdminGuideContent />
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
