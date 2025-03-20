
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
  const [isFullScreen, setIsFullScreen] = useState(false);
  const isMobile = useIsMobile();

  const handleClearFilters = () => {
    setFilters({});
  };

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  // Hide the channel list when in full screen mode
  if (isFullScreen && selectedChannelId) {
    return (
      <InterpreterChat 
        channelId={selectedChannelId} 
        filters={filters} 
        onFiltersChange={setFilters} 
        onClearFilters={handleClearFilters}
        onBackToChannels={() => {
          setIsFullScreen(false);
          if (isMobile) {
            setSelectedChannelId(null);
          }
        }}
        profile={profile}
        onStatusChange={onStatusChange}
        onMenuClick={onMenuClick}
        isFullScreen={isFullScreen}
        onToggleFullScreen={toggleFullScreen}
      />
    );
  }

  return (
    <div className="flex h-full bg-[#121212]">
      {(!selectedChannelId || !isMobile) && (
        <div className={`${selectedChannelId && isMobile ? 'hidden' : 'flex'} flex-col w-full md:w-64 lg:w-72 border-r border-[#333333] h-full bg-[#1E1E1E]`}>
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
            isFullScreen={isFullScreen}
            onToggleFullScreen={toggleFullScreen}
          />
        </div>
      )}
    </div>
  );
};
