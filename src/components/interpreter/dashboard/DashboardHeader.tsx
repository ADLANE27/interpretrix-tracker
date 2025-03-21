
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "../ThemeToggle";
import { Profile } from "@/types/profile";
import { useOrientation } from "@/hooks/use-orientation";
import { StatusButtonsBar } from "../StatusButtonsBar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";

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
  
  // Only hide status buttons in header if we're in a chat tab on portrait mode
  // We'll let the MessagingTab component handle showing status buttons in chat
  const isInChatTab = document.body.hasAttribute('data-in-chat');
  
  // Show status buttons in header except when in chat tab on portrait mode
  const showStatusButtons = !isMobile || 
                           (isMobile && orientation === "landscape") || 
                           (isMobile && !isInChatTab);

  // Format the display name
  const getDisplayName = () => {
    if (!profile) return "Interprète";
    
    if (profile.name) return profile.name;
    
    return `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || "Interprète";
  };

  return (
    <motion.header 
      className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm flex flex-col px-2 md:px-6 sticky top-0 z-40 border-b border-gray-200 dark:border-gray-700 safe-area-top shadow-sm"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="h-[56px] md:h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isMobile && (
            <Button variant="ghost" size="icon" className="rounded-full" onClick={onMenuClick}>
              <Menu className="h-5 w-5" />
            </Button>
          )}
          
          {profile && (
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8 border-2 border-primary/20">
                <AvatarImage src={profile.profile_picture_url || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/30 text-primary font-medium">
                  {profile.first_name?.[0] || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <p className="text-sm font-medium line-clamp-1">{getDisplayName()}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{profile.email}</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 md:gap-3">
          <ThemeToggle />
        </div>
      </div>
      
      {showStatusButtons && (
        <div className="pb-2 md:pb-3 md:py-2 w-full overflow-visible StatusButtonsBar-in-header">
          <StatusButtonsBar 
            currentStatus={profile?.status} 
            onStatusChange={onStatusChange}
            variant={isMobile ? 'compact' : 'default'} 
          />
        </div>
      )}
    </motion.header>
  );
};
