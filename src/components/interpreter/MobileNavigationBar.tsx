
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Calendar, MessageCircle, Headset, Search, FileText } from "lucide-react";

interface MobileNavigationBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  pendingMissionsCount?: number;
  unreadMessagesCount?: number;
}

export const MobileNavigationBar = ({
  activeTab,
  onTabChange,
  pendingMissionsCount = 0,
  unreadMessagesCount = 0
}: MobileNavigationBarProps) => {
  const tabs = [
    { 
      id: "missions", 
      icon: Calendar, 
      label: "Missions",
      badge: pendingMissionsCount > 0 ? pendingMissionsCount : undefined 
    },
    { 
      id: "messages", 
      icon: MessageCircle, 
      label: "Messages",
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined
    },
    { id: "terminology", icon: Search, label: "Recherche" },
    { id: "notes", icon: FileText, label: "Notes" },
    { id: "profile", icon: Headset, label: "Profil" }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-md z-50 md:hidden py-1">
      <div className="flex justify-around items-center">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={cn(
              "flex flex-col items-center justify-center px-1 py-2 relative",
              "focus:outline-none transition-colors duration-200",
              activeTab === tab.id 
                ? "text-primary" 
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => onTabChange(tab.id)}
          >
            <tab.icon 
              className={cn(
                "h-5 w-5 mb-1",
                activeTab === tab.id && "animate-pulse"
              )} 
            />
            <span className="text-xs">{tab.label}</span>
            {tab.badge && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center p-0 text-[10px]"
              >
                {tab.badge}
              </Badge>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
