
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "../ThemeToggle";
import { StatusManager } from "../StatusManager";
import { Profile } from "@/types/profile";

interface DashboardHeaderProps {
  profile: Profile | null;
  onStatusChange: (newStatus: Profile['status']) => Promise<void>;
  onMenuClick: () => void;
  isMobile: boolean;
}

export const DashboardHeader = ({
  profile,
  onStatusChange,
  onMenuClick,
  isMobile
}: DashboardHeaderProps) => {
  return (
    <header className="sticky top-0 z-40 h-[120px] bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b">
      <div className="h-[60px] flex items-center justify-between px-4 md:px-6">
        {isMobile && (
          <Button variant="ghost" size="sm" className="mr-2 -ml-2" onClick={onMenuClick}>
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <div className="flex items-center gap-2 md:gap-3 ml-auto">
          <ThemeToggle />
        </div>
      </div>
      
      <div className="px-4 md:px-6 py-3 w-full overflow-hidden">
        <StatusManager currentStatus={profile?.status} onStatusChange={onStatusChange} />
      </div>
    </header>
  );
};
