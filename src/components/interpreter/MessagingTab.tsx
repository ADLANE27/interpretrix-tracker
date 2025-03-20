
import React, { useState, useEffect } from "react";
import { InterpreterChannelList } from "./chat/InterpreterChannelList";
import { InterpreterChat } from "./chat/InterpreterChat";
import { useIsMobile } from "@/hooks/use-mobile";
import { Profile } from "@/types/profile";
import { useUnreadMentions } from "@/hooks/chat/useUnreadMentions";

interface MessagingTabProps {
  profile?: Profile | null;
  onStatusChange?: (newStatus: Profile['status']) => Promise<void>;
  onMenuClick?: () => void;
}

export const MessagingTab = ({ profile, onStatusChange, onMenuClick }: MessagingTabProps) => {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [filters, setFilters] = useState<any>({});
  const isMobile = useIsMobile();
  const { refreshMentions } = useUnreadMentions();

  const handleClearFilters = () => {
    setFilters({});
  };

  // Refresh mentions initially to ensure badge counts are up to date
  useEffect(() => {
    console.log('[MessagingTab] Initial mention refresh');
    refreshMentions();
    
    // Set up a periodic refresh for mentions
    const intervalId = setInterval(() => {
      console.log('[MessagingTab] Periodic mention refresh');
      refreshMentions();
    }, 20000); // Every 20 seconds to match admin refresh rate
    
    return () => {
      console.log('[MessagingTab] Cleaning up refresh interval');
      clearInterval(intervalId);
    };
  }, [refreshMentions]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex flex-1 h-[calc(100%-20px)] overflow-hidden">
        {(!selectedChannelId || !isMobile) && (
          <div className={`${selectedChannelId && isMobile ? 'hidden' : 'flex'} flex-col w-full md:w-80 lg:w-96 border-r border-border h-full md:mr-6 overflow-hidden`}>
            <InterpreterChannelList 
              onChannelSelect={(channelId) => setSelectedChannelId(channelId)} 
            />
          </div>
        )}

        {selectedChannelId && (
          <div className={`${isMobile ? 'w-full' : 'flex-1'} h-full flex flex-col overflow-hidden`}>
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
          </div>
        )}
      </div>
    </div>
  );
};
