
import React, { useState, useEffect } from "react";
import { InterpreterChannelList } from "./chat/InterpreterChannelList";
import { InterpreterChat } from "./chat/InterpreterChat";
import { useIsMobile } from "@/hooks/use-mobile";
import { Profile } from "@/types/profile";
import { motion } from "framer-motion";

interface MessagingTabProps {
  profile?: Profile | null;
  onStatusChange?: (newStatus: Profile['status']) => Promise<void>;
  onMenuClick?: () => void;
}

export const MessagingTab = ({ profile, onStatusChange, onMenuClick }: MessagingTabProps) => {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [filters, setFilters] = useState<any>({});
  const isMobile = useIsMobile();

  useEffect(() => {
    // Set a data attribute to help identify we're in messages tab
    document.body.setAttribute('data-in-messages-tab', 'true');
    
    return () => {
      document.body.removeAttribute('data-in-messages-tab');
      document.body.removeAttribute('data-in-chat');
    };
  }, []);

  const handleClearFilters = () => {
    setFilters({});
  };

  return (
    <motion.div 
      className="flex h-full overflow-hidden rounded-xl 
        bg-white/90 dark:bg-gray-800/90
        border-[1px] border-slate-200/60 dark:border-slate-700/40
        shadow-sm backdrop-blur-md"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {(!selectedChannelId || !isMobile) && (
        <motion.div 
          className={`${selectedChannelId && isMobile ? 'hidden' : 'flex'} flex-col w-full md:w-72 lg:w-80 border-r border-slate-200/60 dark:border-slate-700/30 h-full overflow-hidden rounded-l-xl`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <InterpreterChannelList 
            onChannelSelect={(channelId) => setSelectedChannelId(channelId)} 
          />
        </motion.div>
      )}

      {selectedChannelId && (
        <motion.div 
          className={`${isMobile ? 'w-full' : 'flex-1'} overflow-hidden h-full rounded-r-xl`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <InterpreterChat 
            channelId={selectedChannelId} 
            filters={filters} 
            onFiltersChange={setFilters} 
            onClearFilters={handleClearFilters}
            onBackToChannels={() => setSelectedChannelId(null)}
            profile={profile}
            onStatusChange={onStatusChange}
            onMenuClick={onMenuClick}
            messageListHeight="50vh"
          />
        </motion.div>
      )}
    </motion.div>
  );
};
