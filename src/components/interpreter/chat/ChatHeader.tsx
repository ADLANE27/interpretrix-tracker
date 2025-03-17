
import React from 'react';
import { ChannelMembersPopover } from "@/components/chat/ChannelMembersPopover";

interface ChatHeaderProps {
  channelId: string;
  channelName: string | undefined;
  channelType: 'group' | 'direct';
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ 
  channelId, 
  channelName,
  channelType
}) => {
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <h2 className="text-lg font-semibold">{channelName}</h2>
      <ChannelMembersPopover 
        channelId={channelId} 
        channelName={channelName || ''} 
        channelType={channelType} 
        userRole="interpreter"
      />
    </div>
  );
};
