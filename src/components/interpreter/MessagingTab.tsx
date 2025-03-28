
import React, { useState, useEffect } from "react";
import { InterpreterChannelList } from "./chat/InterpreterChannelList";
import { InterpreterChat } from "./chat/InterpreterChat";
import { useIsMobile } from "@/hooks/use-mobile";
import { Profile } from "@/types/profile";

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
    <div className="flex h-full overflow-hidden">
      {(!selectedChannelId || !isMobile) && (
        <div className={`${selectedChannelId && isMobile ? 'hidden' : 'flex'} flex-col w-full md:w-64 lg:w-72 border-r border-border h-full overflow-hidden`}>
          <InterpreterChannelList 
            onChannelSelect={(channelId) => setSelectedChannelId(channelId)} 
          />
        </div>
      )}

      {selectedChannelId && (
        <div className={`${isMobile ? 'w-full' : 'flex-1'} overflow-hidden h-full`}>
          <InterpreterChat 
            channelId={selectedChannelId} 
            filters={filters} 
            onFiltersChange={setFilters} 
            onClearFilters={handleClearFilters}
            onBackToChannels={() => setSelectedChannelId(null)}
            profile={profile}
            onStatusChange={onStatusChange}
            onMenuClick={onMenuClick}
            messageListHeight="70vh" // Adding fixed height for message list
          />
        </div>
      )}
    </div>
  );
};
