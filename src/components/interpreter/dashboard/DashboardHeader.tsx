
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "../ThemeToggle";
import { StatusManager } from "../StatusManager";
import { Profile } from "@/types/profile";
import { HowToUseGuide } from "../HowToUseGuide";

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
    <header className="h-auto bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm flex flex-col px-2 md:px-6 sticky top-0 z-40 safe-area-top">
      <div className="h-[56px] md:h-16 flex items-center justify-between">
        {isMobile && (
          <Button variant="ghost" size="icon" className="-ml-1" onClick={onMenuClick}>
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <div className="flex items-center gap-2 md:gap-3 ml-auto">
          <ThemeToggle />
        </div>
      </div>
      
      <div className="pb-3 md:py-3 w-full overflow-visible">
        <StatusManager currentStatus={profile?.status} onStatusChange={onStatusChange} />
      </div>
    </header>
  );
};
