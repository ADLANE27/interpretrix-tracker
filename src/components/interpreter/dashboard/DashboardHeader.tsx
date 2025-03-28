import { ThemeToggle } from "../ThemeToggle";
import { Profile } from "@/types/profile";
import { useOrientation } from "@/hooks/use-orientation";
import { StatusButtonsBar } from "../StatusButtonsBar";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

interface DashboardHeaderProps {
  profile: Profile | null;
  onStatusChange: (newStatus: Profile['status']) => Promise<void>;
  isMobile: boolean;
}

export const DashboardHeader = ({
  profile,
  onStatusChange,
  isMobile
}: DashboardHeaderProps) => {
  const orientation = useOrientation();
  const [isInChatTab, setIsInChatTab] = useState(false);
  const [isInMessagesTab, setIsInMessagesTab] = useState(false);
  
  useEffect(() => {
    const updateStates = () => {
      setIsInChatTab(document.body.hasAttribute('data-in-chat'));
      setIsInMessagesTab(document.body.hasAttribute('data-in-messages-tab'));
    };

    updateStates();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'data-in-chat' || 
             mutation.attributeName === 'data-in-messages-tab')) {
          updateStates();
        }
      });
    });

    observer.observe(document.body, { attributes: true });

    return () => {
      observer.disconnect();
    };
  }, []);
  
  const showStatusButtons = !isMobile || 
                          (isMobile && orientation === "landscape") || 
                          (isMobile && !isInChatTab && !isInMessagesTab);

  return (
    <motion.header 
      className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg flex flex-col px-2 md:px-6 sticky top-0 z-40 border-b border-gray-200/20 dark:border-gray-700/20 safe-area-top shadow-sm pt-4 safe-area-top"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, type: "spring" }}
    >
      <div className="h-[56px] md:h-16 flex items-center justify-between">
        <div className="flex-1 mr-4">
          {showStatusButtons && (
            <StatusButtonsBar 
              currentStatus={profile?.status} 
              onStatusChange={onStatusChange}
              variant={isMobile ? 'compact' : 'default'} 
            />
          )}
        </div>
        
        <ThemeToggle />
      </div>
    </motion.header>
  );
};
