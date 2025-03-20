
import React, { useState } from "react";
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

  const handleClearFilters = () => {
    setFilters({});
  };

  return (
    <div className="flex h-full">
      {(!selectedChannelId || !isMobile) && (
        <div className={`${selectedChannelId && isMobile ? 'hidden' : 'flex'} flex-col w-full md:w-80 lg:w-96 border-r border-border h-full md:mr-6`}>
          <InterpreterChannelList 
            onChannelSelect={(channelId) => setSelectedChannelId(channelId)} 
          />
        </div>
      )}

      {selectedChannelId && (
        <div className={`${isMobile ? 'w-full' : 'flex-1'}`}>
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
  );
};
