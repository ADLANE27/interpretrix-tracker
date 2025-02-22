
import { useNavigate } from "react-router-dom";
import { LogOut, MessageCircle, Calendar, Headset } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  userStatus: string;
  profilePictureUrl?: string;
}

export const Sidebar = ({ activeTab, onTabChange, userStatus, profilePictureUrl }: SidebarProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

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

  const tabs = [
    { id: "missions", label: "Missions", icon: Calendar },
    { id: "messages", label: "Messages", icon: MessageCircle },
    { id: "profile", label: "Profil", icon: Headset },
    { id: "calendar", label: "Calendrier", icon: Calendar },
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

      <nav className="flex-1 space-y-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              className={cn(
                "w-full justify-start gap-2",
                "transition-all duration-200 font-medium",
                activeTab === tab.id && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
              )}
              onClick={() => onTabChange(tab.id)}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </Button>
          );
        })}
      </nav>
    </div>
  );
};
