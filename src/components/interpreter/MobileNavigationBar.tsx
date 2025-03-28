
import React from 'react';
import { Menu, MessageCircle, User, Home } from 'lucide-react';
import { cn } from "@/lib/utils";
import { motion } from 'framer-motion';
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { useUnreadMentions } from '@/hooks/chat/useUnreadMentions'; // Add this import

export const MobileNavigationBar: React.FC<MobileNavigationBarProps> = ({ 
  activeTab, 
  onTabChange,
  pendingMissionsCount = 0,
  onMenuClick
}) => {
  const isMobile = useIsMobile();
  const { totalUnreadMentionsCount } = useUnreadMentions(); // Get unread mentions
  
  if (!isMobile) return null;
  
  const tabs = [
    { 
      id: "missions", 
      label: "Missions", 
      mobileLabel: "Missions", 
      icon: Home, 
      badge: pendingMissionsCount 
    },
    { 
      id: "messages", 
      label: "Messages", 
      mobileLabel: "Messages", 
      icon: MessageCircle, 
      badge: totalUnreadMentionsCount 
    },
    { 
      id: "profile", 
      label: "Profil", 
      mobileLabel: "Profil", 
      icon: User 
    }
  ];

  return (
    <motion.div 
      className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border-t border-gray-200 dark:border-gray-700 safe-area-bottom z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3, type: "spring" }}
    >
      <div className="flex items-center justify-around px-2 py-2">
        <button
          className={cn(
            "flex flex-col items-center justify-center py-1 px-3 relative",
            "transition-all duration-200 rounded-lg",
            "focus:outline-none active:scale-95",
            "text-gray-500 dark:text-gray-400"
          )}
          onClick={onMenuClick}
        >
          <Menu className="w-5 h-5 mb-1" />
          <span className="text-xs font-medium">
            Menu
          </span>
        </button>

        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              className={cn(
                "flex flex-col items-center justify-center py-1 px-3 relative",
                "transition-all duration-200 rounded-lg",
                "focus:outline-none active:scale-95",
                isActive 
                  ? "text-primary" 
                  : "text-gray-500 dark:text-gray-400"
              )}
              onClick={() => onTabChange(tab.id)}
            >
              <div className="relative">
                <Icon className={cn(
                  "w-5 h-5 mb-1",
                  isActive && "text-primary"
                )} />
                
                {tab.badge && tab.badge > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -right-2 -top-2 h-4 min-w-4 flex items-center justify-center p-0 text-[10px]"
                  >
                    {tab.badge}
                  </Badge>
                )}
              </div>
              
              <span className={cn(
                "text-xs font-medium",
                isActive ? "text-primary" : "text-gray-500 dark:text-gray-400"
              )}>
                {tab.mobileLabel}
              </span>
              
              {isActive && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute -bottom-1 left-[25%] right-[25%] h-0.5 bg-primary rounded-full"
                  transition={{ duration: 0.2 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};
