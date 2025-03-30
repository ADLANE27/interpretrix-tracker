
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
    // Set data attribute to signal we're in messages tab, but not in chat
    document.body.removeAttribute('data-in-chat');
    
    return () => {
      // Clean up both attributes on unmount
      document.body.removeAttribute('data-in-chat');
    };
  }, []);

  // Update data-in-chat attribute when a channel is selected on mobile
  useEffect(() => {
    if (isMobile && selectedChannelId) {
      document.body.setAttribute('data-in-chat', 'true');
    } else {
      document.body.removeAttribute('data-in-chat');
    }
    
    return () => {
      document.body.removeAttribute('data-in-chat');
    };
  }, [selectedChannelId, isMobile]);

  const handleClearFilters = () => {
    setFilters({});
  };

  return (
    <motion.div 
      className="flex h-full overflow-hidden rounded-xl bg-gradient-to-br from-white/80 to-palette-soft-blue/40 dark:from-gray-800/90 dark:to-palette-ocean-blue/20 backdrop-blur-md shadow-lg border border-white/10 dark:border-gray-700/30"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {(!selectedChannelId || !isMobile) && (
        <motion.div 
          className={`${selectedChannelId && isMobile ? 'hidden' : 'flex'} flex-col w-full md:w-72 lg:w-80 border-r border-white/20 dark:border-gray-700/30 h-full overflow-hidden rounded-l-xl`}
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
          />
        </motion.div>
      )}
    </motion.div>
  );
};
