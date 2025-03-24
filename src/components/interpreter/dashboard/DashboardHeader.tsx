import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "../ThemeToggle";
import { Profile } from "@/types/profile";
import { useOrientation } from "@/hooks/use-orientation";
import { StatusButtonsBar } from "../StatusButtonsBar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { eventEmitter, EVENT_STATUS_UPDATE } from "@/lib/events";

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
  const [isInChatTab, setIsInChatTab] = useState(false);
  const [localProfileStatus, setLocalProfileStatus] = useState<Profile['status'] | undefined>(
    profile?.status
  );
  
  useEffect(() => {
    if (profile?.status && profile.status !== localProfileStatus) {
      console.log('[DashboardHeader] Updating local profile status from prop:', profile.status);
      setLocalProfileStatus(profile.status);
    }
  }, [profile?.status, localProfileStatus]);
  
  useEffect(() => {
    if (!profile?.id) return;
    
    const handleStatusUpdate = (data: { status: Profile['status'], userId: string }) => {
      if (data.userId === profile.id && data.status !== localProfileStatus) {
        console.log('[DashboardHeader] Received status update event:', data.status);
        setLocalProfileStatus(data.status);
      }
    };
    
    eventEmitter.on(EVENT_STATUS_UPDATE, handleStatusUpdate);
    
    return () => {
      eventEmitter.off(EVENT_STATUS_UPDATE, handleStatusUpdate);
    };
  }, [profile?.id, localProfileStatus]);
  
  useEffect(() => {
    const updateChatState = () => {
      setIsInChatTab(document.body.hasAttribute('data-in-chat'));
    };

    updateChatState();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-in-chat') {
          updateChatState();
        }
      });
    });

    observer.observe(document.body, { attributes: true });

    return () => {
      observer.disconnect();
    };
  }, []);
  
  const handleStatusChange = async (newStatus: Profile['status']) => {
    if (!profile?.id) return;
    
    setLocalProfileStatus(newStatus);
    
    eventEmitter.emit(EVENT_STATUS_UPDATE, {
      status: newStatus,
      userId: profile.id
    });
    
    await onStatusChange(newStatus);
  };
  
  const showStatusButtons = !isMobile || 
                          (isMobile && orientation === "landscape") || 
                          (isMobile && !isInChatTab);

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
      
      {showStatusButtons && localProfileStatus && (
        <div className="pb-2 md:pb-3 md:py-2 w-full overflow-visible StatusButtonsBar-in-header">
          <StatusButtonsBar 
            currentStatus={localProfileStatus} 
            onStatusChange={handleStatusChange}
            variant={isMobile ? 'compact' : 'default'} 
          />
        </div>
      )}
    </motion.header>
  );
};
