
import { ThemeToggle } from "../ThemeToggle";
import { Profile } from "@/types/profile";
import { useOrientation } from "@/hooks/use-orientation";
import { StatusButtonsBar } from "../StatusButtonsBar";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  
  // Use an effect to update the isInChatTab state whenever data-in-chat attribute changes
  useEffect(() => {
    const updateChatState = () => {
      setIsInChatTab(document.body.hasAttribute('data-in-chat'));
    };

    // Initial check
    updateChatState();

    // Set up a MutationObserver to watch for changes to the data-in-chat attribute
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
  
  // Show status buttons in header except when in chat tab on portrait mode
  const showStatusButtons = !isMobile || 
                          (isMobile && orientation === "landscape") || 
                          (isMobile && !isInChatTab);

  return (
    <motion.header 
      className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg flex flex-col px-2 md:px-6 sticky top-0 z-40 border-b border-gray-200/20 dark:border-gray-700/20 safe-area-top shadow-sm"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, type: "spring" }}
    >
      <div className="h-[56px] md:h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isMobile && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onMenuClick}
              className="rounded-full bg-gray-100/50 dark:bg-gray-800/50 hover:bg-primary/10"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          )}
        </div>
        
        {showStatusButtons && (
          <div className="flex-1 mr-4">
            <StatusButtonsBar 
              currentStatus={profile?.status} 
              onStatusChange={onStatusChange}
              variant={isMobile ? 'compact' : 'default'} 
            />
          </div>
        )}
        
        <ThemeToggle />
      </div>
    </motion.header>
  );
};
