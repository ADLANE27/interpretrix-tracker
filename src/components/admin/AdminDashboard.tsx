import React, { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, Menu } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useLazyTab } from "@/hooks/useLazyTab";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("interpreters");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const tabs = [
    { id: "interpreters", label: "Interprètes" },
    { id: "missions", label: "Missions" },
    { id: "reservations", label: "Réservations" },
    { id: "calendar", label: "Calendrier" },
    { id: "messages", label: "Messages" },
    { id: "users", label: "Utilisateurs" },
    { id: "guide", label: "Guide" },
  ];

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setIsMenuOpen(false);
  };

  const handleLogout = async () => {
    try {
      const {
        error
      } = await supabase.auth.signOut();
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

  // Lazy load components
  const interpretersTab = useLazyTab(() => import('./tabs/InterpretersTab').then(m => ({ default: m.InterpretersTab })));
  const missionsTab = useLazyTab(() => import('./MissionManagement').then(m => ({ default: m.MissionManagement })));
  const reservationsTab = useLazyTab(() => import('./reservations/ReservationsTab').then(m => ({ default: m.ReservationsTab })));
  const calendarTab = useLazyTab(() => import('./AdminMissionsCalendar').then(m => ({ default: m.AdminMissionsCalendar })));
  const messagesTab = useLazyTab(() => import('./MessagesTab').then(m => ({ default: m.MessagesTab })));
  const usersTab = useLazyTab(() => import('./UserManagement').then(m => ({ default: m.UserManagement })));
  const guideTab = useLazyTab(() => import('./AdminGuideContent').then(m => ({ default: m.AdminGuideContent })));

  return (
    <div className="flex flex-col h-full">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col h-full scroll-smooth">
        <div className="flex justify-between items-center sticky top-0 bg-background/95 backdrop-blur-sm z-20 py-3 px-4 sm:px-6 border-b shadow-sm">
          {isMobile ? (
            <div className="flex items-center gap-3 w-full">
              <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="touch-target">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] sm:w-[320px]">
                  <div className="flex flex-col gap-1.5 mt-6">
                    {tabs.map(tab => (
                      <Button
                        key={tab.id}
                        variant={activeTab === tab.id ? "default" : "ghost"}
                        className="justify-start h-11"
                        onClick={() => handleTabChange(tab.id)}
                      >
                        {tab.label}
                      </Button>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>
              <div className="flex-1 text-lg font-semibold">
                {tabs.find(tab => tab.id === activeTab)?.label}
              </div>
            </div>
          ) : (
            <div className="flex gap-4 items-center flex-1">
              <TabsList className="bg-muted/50 flex-1 gap-1">
                {tabs.map(tab => (
                  <TabsTrigger 
                    key={tab.id} 
                    value={tab.id} 
                    className="flex-1 px-6"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          )}
          <Button variant="outline" onClick={handleLogout} className="gap-2 shrink-0">
            <LogOut className="h-4 w-4" />
            {!isMobile && "Se déconnecter"}
          </Button>
        </div>

        <div className="flex-1 min-h-0 relative">
          <TabsContent value="interpreters" className="absolute inset-0 overflow-auto">
            {interpretersTab}
          </TabsContent>

          <TabsContent value="missions" className="absolute inset-0 overflow-auto">
            <div className="min-h-full p-4 sm:p-6">
              {missionsTab}
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="absolute inset-0 overflow-auto">
            <div className="min-h-full p-4 sm:p-6">
              {calendarTab}
            </div>
          </TabsContent>

          <TabsContent value="messages" className="absolute inset-0 overflow-auto">
            <div className="min-h-full p-4 sm:p-6">
              {messagesTab}
            </div>
          </TabsContent>

          <TabsContent value="users" className="absolute inset-0 overflow-auto">
            <div className="min-h-full p-4 sm:p-6">
              {usersTab}
            </div>
          </TabsContent>

          <TabsContent value="reservations" className="absolute inset-0 overflow-auto">
            <div className="min-h-full p-4 sm:p-6">
              {reservationsTab}
            </div>
          </TabsContent>

          <TabsContent value="guide" className="absolute inset-0 overflow-auto">
            <div className="min-h-full p-4 sm:p-6">
              {guideTab}
            </div>
          </TabsContent>
        </div>

        <footer className="py-3 text-center text-sm text-muted-foreground border-t px-4 sm:px-6 bg-background/95 backdrop-blur-sm">
          © {new Date().getFullYear()} AFTraduction. Tous droits réservés.
        </footer>
      </Tabs>
    </div>
  );
};
