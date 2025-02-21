
import { Bell, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "../ThemeToggle";
import { StatusManager } from "../StatusManager";
import { Profile } from "@/types/profile";

interface DashboardHeaderProps {
  profile: Profile | null;
  onStatusChange: (newStatus: Profile['status']) => Promise<void>;
}

export const DashboardHeader = ({ profile, onStatusChange }: DashboardHeaderProps) => {
  return (
    <header className="h-16 border-b bg-white dark:bg-gray-800 flex items-center justify-between px-6 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <StatusManager
          currentStatus={profile?.status}
          onStatusChange={onStatusChange}
        />
      </div>
      
      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon"
          className="relative text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <Bell className="h-5 w-5" />
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0"
          >
            3
          </Badge>
        </Button>
        <Button variant="ghost" size="icon">
          <ExternalLink className="h-5 w-5" />
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
};
