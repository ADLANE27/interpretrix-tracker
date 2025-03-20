
import React from 'react';
import { ChannelHeader } from './channel/ChannelHeader';
import { ChatContainer } from './ChatContainer';
import { useChannelData } from "@/hooks/chat/useChannelData";

interface ChatProps {
  channelId: string;
  userRole?: 'admin' | 'interpreter';
}

const Chat = ({ channelId, userRole = 'admin' }: ChatProps) => {
  const { channel, channelName, channelType } = useChannelData(channelId);

  return (
    <div className="flex flex-col h-full">
      <ChannelHeader 
        channelId={channelId}
        channelName={channelName}
        channelType={channelType}
        userRole={userRole}
      />
      
      <ChatContainer 
        channelId={channelId}
        userRole={userRole}
      />
    </div>
  );
};

export default Chat;
