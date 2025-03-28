
import { ThemeToggle } from "../ThemeToggle";
import { Profile } from "@/types/profile";
import { useOrientation } from "@/hooks/use-orientation";
import { StatusButtonsBar } from "../StatusButtonsBar";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

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
      className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm flex flex-col px-2 md:px-6 sticky top-0 z-40 border-b border-gray-200 dark:border-gray-700 safe-area-top shadow-sm"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="h-[56px] md:h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Le bouton menu a été retiré d'ici */}
        </div>
        
        <ThemeToggle />
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
