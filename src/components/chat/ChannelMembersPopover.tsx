
import React from 'react';
import { Button } from "@/components/ui/button";

interface ChannelMembersPopoverProps {
  channelId: string;
}

export const ChannelMembersPopover: React.FC<ChannelMembersPopoverProps> = ({
  channelId,
}) => {
  return (
    <Button variant="ghost" size="sm">
      Members
    </Button>
  );
};
