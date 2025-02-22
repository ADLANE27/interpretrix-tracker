
import React from 'react';
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

interface ChannelMembersPopoverProps {
  channelId: string;
}

export const ChannelMembersPopover: React.FC<ChannelMembersPopoverProps> = ({
  channelId,
}) => {
  const isMobile = useIsMobile();
  
  return (
    <Button 
      variant="ghost" 
      size="sm"
      className="whitespace-nowrap"
    >
      {!isMobile && "Participants"}
    </Button>
  );
};
