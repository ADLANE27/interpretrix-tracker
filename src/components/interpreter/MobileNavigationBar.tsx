
import React from 'react';
import { Calendar, MessageCircle, User, Home } from 'lucide-react';
import { cn } from "@/lib/utils";
import { motion } from 'framer-motion';
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";

interface MobileNavigationBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  pendingMissionsCount?: number;
  unreadMessagesCount?: number;
}

export const MobileNavigationBar: React.FC<MobileNavigationBarProps> = ({ 
  activeTab, 
  onTabChange,
  pendingMissionsCount = 0,
  unreadMessagesCount = 0
}) => {
  const isMobile = useIsMobile();
  
  if (!isMobile) return null;
  
  const tabs = [
    { id: "missions", label: "Missions", icon: Home, badge: pendingMissionsCount },
    { id: "messages", label: "Messages", icon: MessageCircle, badge: unreadMessagesCount },
    { id: "profile", label: "Profil", icon: User }
  ];

  return (
    <motion.div 
      className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 safe-area-bottom z-50 shadow-lg"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3, type: "spring" }}
    >
      <div className="flex items-center justify-around px-2 py-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-3 relative",
                "transition-all duration-200 rounded-lg",
                "focus:outline-none touch-feedback",
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
                {tab.label}
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
