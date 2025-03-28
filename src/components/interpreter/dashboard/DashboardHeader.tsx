
import { ThemeToggle } from "../ThemeToggle";
import { Profile } from "@/types/profile";
import { useOrientation } from "@/hooks/use-orientation";
import { StatusButtonsBar } from "../StatusButtonsBar";
import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";

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
  const checkStateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mutationObserverRef = useRef<MutationObserver | null>(null);
  
  // Use a more efficient approach to check data attributes
  const checkDataAttributes = () => {
    const newIsInChatTab = document.body.hasAttribute('data-in-chat');
    const newIsInMessagesTab = document.body.hasAttribute('data-in-messages-tab');
    
    if (newIsInChatTab !== isInChatTab) {
      setIsInChatTab(newIsInChatTab);
    }
    
    if (newIsInMessagesTab !== isInMessagesTab) {
      setIsInMessagesTab(newIsInMessagesTab);
    }
  };
  
  // Set up a better attribute monitoring system
  useEffect(() => {
    // Initial check
    checkDataAttributes();
    
    // Clear any existing observer and timeout
    if (mutationObserverRef.current) {
      mutationObserverRef.current.disconnect();
    }
    
    if (checkStateTimeoutRef.current) {
      clearTimeout(checkStateTimeoutRef.current);
    }
    
    // Set up a MutationObserver with optimized configuration
    const observer = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && 
           (mutation.attributeName === 'data-in-chat' || 
            mutation.attributeName === 'data-in-messages-tab')) {
          shouldUpdate = true;
          break;
        }
      }
      
      if (shouldUpdate) {
        // Debounce updates to avoid rapid changes
        if (checkStateTimeoutRef.current) {
          clearTimeout(checkStateTimeoutRef.current);
        }
        
        checkStateTimeoutRef.current = setTimeout(() => {
          checkDataAttributes();
        }, 100);
      }
    });
    
    observer.observe(document.body, { 
      attributes: true,
      attributeFilter: ['data-in-chat', 'data-in-messages-tab'] // Only watch these specific attributes
    });
    
    mutationObserverRef.current = observer;
    
    return () => {
      if (mutationObserverRef.current) {
        mutationObserverRef.current.disconnect();
      }
      
      if (checkStateTimeoutRef.current) {
        clearTimeout(checkStateTimeoutRef.current);
      }
    };
  }, []);
  
  // Show status buttons in header except when in chat tab on portrait mode
  // Now also checks if we're in messages tab, which is handled separately
  const showStatusButtons = !isMobile || 
                          (isMobile && orientation === "landscape") || 
                          (isMobile && !isInChatTab && !isInMessagesTab);

  return (
    <motion.header 
      className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg flex flex-col px-2 md:px-6 sticky top-0 z-40 border-b border-gray-200/20 dark:border-gray-700/20 safe-area-top shadow-sm pt-6"
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
