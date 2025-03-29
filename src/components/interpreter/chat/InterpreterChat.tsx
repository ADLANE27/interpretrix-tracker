
import React, { useState, useRef } from 'react';
import { useChat } from "@/hooks/useChat";
import { ChatInput } from "@/components/chat/ChatInput";
import { MessageList } from "@/components/chat/MessageList";
import { Message } from "@/types/messaging";
import { useIsMobile } from "@/hooks/use-mobile";
import { Profile } from "@/types/profile";
import { useToast } from "@/hooks/use-toast";
import { useBrowserNotification } from '@/hooks/useBrowserNotification';
import { StatusButtonsBar } from "@/components/interpreter/StatusButtonsBar";
import { Menu, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOptimizedChatSubscription } from '@/hooks/chat/useOptimizedChatSubscription';
import EnhancedChat from '@/components/chat/EnhancedChat';

interface InterpreterChatProps {
  channelId: string;
  filters: any;
  onFiltersChange: (filters: any) => void;
  onClearFilters: () => void;
  onBackToChannels?: () => void;
  profile?: Profile | null;
  onStatusChange?: (newStatus: Profile['status']) => Promise<void>;
  onMenuClick?: () => void;
  messageListHeight?: string;
}

export const InterpreterChat = ({
  channelId,
  onBackToChannels,
  profile,
  onStatusChange,
  onMenuClick,
  messageListHeight = "calc(100vh - 260px)",
}: InterpreterChatProps) => {
  const isMobile = useIsMobile();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-white/80 to-palette-light-blue/40 dark:from-gray-800/80 dark:to-palette-ocean-blue/20 border-b border-white/10 dark:border-gray-800/30">
        <div className="flex items-center gap-2">
          {isMobile && onBackToChannels && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBackToChannels}
              className="mr-1"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          {onMenuClick && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
        </div>

        {profile && onStatusChange && (
          <StatusButtonsBar
            currentStatus={profile.status}
            onStatusChange={onStatusChange}
            className="flex-1 justify-end md:justify-start md:flex-none"
          />
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        <EnhancedChat
          channelId={channelId}
          userRole="interpreter"
          messageListHeight={messageListHeight}
        />
      </div>
    </div>
  );
};
