
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "../ThemeToggle";
import { StatusManager } from "../StatusManager";
import { Profile } from "@/types/profile";
import { useOrientation } from "@/hooks/use-orientation";

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
  const orientation = useOrientation();
  
  // Always show status buttons in header except when in chat tab on portrait mode
  // This will be handled by the MessagingTab directly
  const isInChatTab = window.location.hash.includes('messages') || 
                      document.querySelector('[data-channel-id]') !== null;
  const showStatusButtons = !isMobile || 
                           (isMobile && orientation === "landscape") || 
                           (isMobile && !isInChatTab);

  return (
    <header className="h-auto bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm flex flex-col px-2 md:px-6 sticky top-0 z-40 border-b border-gray-200 dark:border-gray-700 safe-area-top">
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
      
      {showStatusButtons && (
        <div className="pb-3 md:py-3 w-full overflow-visible">
          <StatusManager currentStatus={profile?.status} onStatusChange={onStatusChange} />
        </div>
      )}
    </header>
  );
};
