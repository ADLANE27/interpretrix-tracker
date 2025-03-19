
import { useNavigate } from "react-router-dom";
import { LogOut, MessageCircle, Calendar, Headset, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { HowToUseGuide } from "./HowToUseGuide";
import { Mission } from "@/types/mission";
import { useUnreadMentions } from "@/hooks/chat/useUnreadMentions";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  userStatus: string;
  profilePictureUrl?: string;
}

export const Sidebar = ({ activeTab, onTabChange, userStatus, profilePictureUrl }: SidebarProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [pendingMissionsCount, setPendingMissionsCount] = useState(0);
  const { totalUnreadCount, refreshMentions } = useUnreadMentions();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Déconnexion réussie",
        description: "Vous avez été déconnecté avec succès"
      });
      navigate("/interpreter/login");
    } catch (error) {
      console.error("[Sidebar] Error during logout:", error);
      toast({
        title: "Erreur",
        description: "Impossible de vous déconnecter",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    console.log('[Sidebar] Setting up mission notification listener');
    const fetchPendingMissions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('[Sidebar] No authenticated user found');
          setPendingMissionsCount(0);
          return;
        }

        console.log('[Sidebar] Fetching missions for user:', user.id);
        
        const { data: missions, error } = await supabase
          .from('interpretation_missions')
          .select('*')
          .or(`notified_interpreters.cs.{${user.id}},assigned_interpreter_id.eq.${user.id}`)
          .eq('status', 'awaiting_acceptance');

        if (error) {
          console.error('[Sidebar] Error fetching pending missions:', error);
          throw error;
        }

        console.log('[Sidebar] Pending missions count:', missions?.length);
        setPendingMissionsCount(missions?.length || 0);
      } catch (error) {
        console.error('[Sidebar] Error fetching pending missions:', error);
      }
    };

    // Initial fetch
    fetchPendingMissions();
    
    // Set up real-time subscription for mission updates
    const channel = supabase
      .channel('pending-missions-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interpretation_missions'
        },
        (payload) => {
          console.log('[Sidebar] Mission update received:', payload);
          fetchPendingMissions();
        }
      )
      .subscribe(status => {
        console.log('[Sidebar] Subscription status:', status);
      });

    return () => {
      console.log('[Sidebar] Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, []);

  // Effect to refresh mentions when the component mounts
  useEffect(() => {
    refreshMentions();
    
    // Set up a regular refresh interval for mentions
    const intervalId = setInterval(() => {
      refreshMentions();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(intervalId);
  }, [refreshMentions]);

  console.log('[Sidebar] Current badge counts:', {
    pendingMissions: pendingMissionsCount,
    unreadMessages: totalUnreadCount
  });

  const tabs = [
    { 
      id: "missions", 
      label: "Missions", 
      icon: Calendar,
      badge: pendingMissionsCount > 0 ? pendingMissionsCount : undefined
    },
    { 
      id: "messages", 
      label: "Messages", 
      icon: MessageCircle,
      badge: totalUnreadCount > 0 ? totalUnreadCount : undefined
    },
    { id: "profile", label: "Profil", icon: Headset },
    { id: "calendar", label: "Calendrier", icon: Calendar },
    { id: "guide", label: "Guide", icon: BookOpen, onClick: () => setIsGuideOpen(true) },
  ];

  const getStatusColor = () => {
    switch (userStatus) {
      case "available":
        return "bg-interpreter-available";
      case "busy":
        return "bg-interpreter-busy";
      case "pause":
        return "bg-interpreter-pause";
      case "unavailable":
        return "bg-interpreter-unavailable";
      default:
        return "bg-gray-400";
    }
  };

  return (
    <div className="h-screen w-64 bg-card border-r border-border flex flex-col p-4 dark:bg-card">
      <div className="flex flex-col items-center justify-center py-6 space-y-4">
        <div className="relative">
          <div className={cn(
            "w-3 h-3 rounded-full absolute -right-1 -top-1",
            getStatusColor(),
            "animate-pulse"
          )} />
          <Avatar className="w-12 h-12">
            <AvatarImage 
              src={profilePictureUrl} 
              alt="Photo de profil"
              className="rounded-full object-cover"
            />
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/30">
              <Headset className="w-6 h-6 text-primary" />
            </AvatarFallback>
          </Avatar>
        </div>
        <Button
          variant="ghost"
          className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 w-full"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </Button>
      </div>

      <nav className="flex-1 my-2">
        <div className="space-y-2 rounded-lg p-4 bg-background/50 mx-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start gap-2 relative px-4",
                  "transition-all duration-200 font-medium rounded-md",
                  activeTab === tab.id 
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" 
                    : "hover:bg-background"
                )}
                onClick={() => tab.onClick ? tab.onClick() : onTabChange(tab.id)}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.badge !== undefined && (
                  <Badge 
                    variant="destructive" 
                    className="absolute right-2 animate-pulse"
                  >
                    {tab.badge}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>
      </nav>

      <HowToUseGuide open={isGuideOpen} onOpenChange={setIsGuideOpen} />
    </div>
  );
};
