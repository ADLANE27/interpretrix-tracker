
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { MessagesTab } from "./MessagesTab";
import { InterpreterList } from "./InterpreterList";
import { UserManagement } from "./UserManagement";
import { MissionManagement } from "./MissionManagement";
import { ReservationsTab } from "./reservations/ReservationsTab";
import { AdminGuideContent } from "./AdminGuideContent";
import { StatisticsCards } from "./dashboard/StatisticsCards";
import { LogOut, User, MessageSquare, Calendar, Users, Settings, BookOpen, BarChart3 } from "lucide-react";
import { PasswordChangeDialog } from "../interpreter/PasswordChangeDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUnreadMentions } from "@/hooks/chat/useUnreadMentions";
import { useTabPersistence } from "@/hooks/useTabPersistence";
import { useSupabaseConnection } from "@/hooks/useSupabaseConnection";
import { MentionsPopover } from "./MentionsPopover";

export const AdminDashboard = () => {
  const [isLogoutLoading, setIsLogoutLoading] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { totalUnreadCount } = useUnreadMentions();
  const { activeTab, setActiveTab } = useTabPersistence('admin', 'dashboard');
  
  // Initialise Supabase realtime connection
  useSupabaseConnection();

  // Parse URL parameters to get active tab
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [location.search, setActiveTab]);

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    navigate(`/admin?tab=${value}`);
  };

  const handleSignOut = async () => {
    setIsLogoutLoading(true);
    try {
      await supabase.auth.signOut();
      navigate('/admin/login');
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        title: "Erreur",
        description: "Problème lors de la déconnexion. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsLogoutLoading(false);
    }
  };

  // Mock statistics data for the dashboard
  const statisticsData = {
    totalInterpreters: 25,
    availableCount: 12,
    busyCount: 5,
    pauseCount: 3,
    unavailableCount: 5,
    todayMissionsCount: 8
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white dark:bg-gray-950 sticky top-0 z-10">
        <div className="flex h-16 items-center px-4 sm:px-6">
          <span className="text-xl font-semibold">PLANET&nbsp;Interprètes</span>
          <span className="text-xl font-normal text-muted-foreground ml-2">Admin</span>
          
          <div className="ml-auto flex items-center space-x-4">
            <MentionsPopover />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsPasswordDialogOpen(true)}
              className="text-muted-foreground"
            >
              <User className="mr-2 h-4 w-4" />
              <span>Mon compte</span>
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSignOut} 
              disabled={isLogoutLoading}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Déconnexion</span>
            </Button>
          </div>
        </div>
      </header>
      
      {/* Main content with tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs 
          value={activeTab} 
          onValueChange={handleTabChange} 
          className="h-full flex flex-col"
        >
          <div className="border-b px-4 sm:px-6">
            <TabsList className="!justify-start h-12 px-0">
              <TabsTrigger value="dashboard" className="flex items-center gap-1">
                <BarChart3 className="h-4 w-4" />
                <span>Tableau de bord</span>
              </TabsTrigger>
              <TabsTrigger value="interpreters" className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>Interprètes</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-1">
                <Settings className="h-4 w-4" />
                <span>Administrateurs</span>
              </TabsTrigger>
              <TabsTrigger value="messages" className="flex items-center gap-1 relative">
                <MessageSquare className="h-4 w-4" />
                <span>Messages</span>
                {totalUnreadCount > 0 && (
                  <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-destructive text-[10px] flex items-center justify-center text-white font-medium translate-x-1/3 -translate-y-1/3">
                    {totalUnreadCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="missions" className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Missions</span>
              </TabsTrigger>
              <TabsTrigger value="reservations" className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Réservations</span>
              </TabsTrigger>
              <TabsTrigger value="guide" className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                <span>Guide</span>
              </TabsTrigger>
            </TabsList>
          </div>
          
          <div className="flex-1 overflow-auto">
            <TabsContent value="dashboard" className="h-full m-0 p-4 sm:p-6">
              <StatisticsCards {...statisticsData} />
            </TabsContent>
            <TabsContent value="interpreters" className="h-full m-0">
              <InterpreterList />
            </TabsContent>
            <TabsContent value="users" className="h-full m-0">
              <UserManagement />
            </TabsContent>
            <TabsContent value="messages" className="h-full m-0">
              <MessagesTab />
            </TabsContent>
            <TabsContent value="missions" className="h-full m-0">
              <MissionManagement />
            </TabsContent>
            <TabsContent value="reservations" className="h-full m-0">
              <ReservationsTab />
            </TabsContent>
            <TabsContent value="guide" className="h-full m-0 p-4 sm:p-6">
              <AdminGuideContent />
            </TabsContent>
          </div>
        </Tabs>
      </div>
      
      {/* Password change dialog */}
      <PasswordChangeDialog
        open={isPasswordDialogOpen}
        onOpenChange={setIsPasswordDialogOpen}
        onPasswordChanged={() => {
          // Handle password change success
          toast({
            title: "Succès",
            description: "Votre mot de passe a été modifié avec succès",
          });
        }}
      />
    </div>
  );
};
