
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { InterpreterChannelList } from "./chat/InterpreterChannelList";
import { InterpreterChat } from "./chat/InterpreterChat";
import { useIsMobile } from "@/hooks/use-mobile";
import { Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MentionsPopover } from "@/components/chat/MentionsPopover";
import { useUnreadMentions } from "@/hooks/chat/useUnreadMentions";
import { Badge } from "@/components/ui/badge";

export const MessagingTab = () => {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [showChannels, setShowChannels] = useState(true);
  const [filters, setFilters] = useState<{
    userId?: string;
    keyword?: string;
    date?: Date;
  }>({});
  const isMobile = useIsMobile();
  const { 
    unreadMentions,
    totalUnreadCount,
    markMentionAsRead,
    deleteMention,
    refreshMentions 
  } = useUnreadMentions();

  const handleFiltersChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const handleChannelSelect = (channelId: string) => {
    setSelectedChannelId(channelId);
    if (isMobile) {
      setShowChannels(false);
    }
  };

  const handleMentionClick = async (mention: any) => {
    if (mention.channel_id) {
      setSelectedChannelId(mention.channel_id);
      if (isMobile) {
        setShowChannels(false);
      }
    }
    await markMentionAsRead(mention.mention_id);
    await refreshMentions();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 h-full pb-safe max-h-full">
      {(!selectedChannelId || showChannels || !isMobile) && (
        <Card className={cn(
          "p-2 lg:col-span-1 overflow-hidden",
          "bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm",
          "transition-all duration-200 rounded-lg",
          isMobile && selectedChannelId && "fixed inset-0 z-50 m-0 rounded-none"
        )}>
          <div className="flex items-center justify-between mb-2 px-2">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">Conversations</h2>
            </div>
            <div className="flex items-center gap-2">
              <MentionsPopover
                mentions={unreadMentions}
                totalCount={totalUnreadCount}
                onMentionClick={handleMentionClick}
                onMarkAsRead={markMentionAsRead}
                onDelete={deleteMention}
              >
                <div className={cn(
                  "transition-all duration-200 p-1.5",
                  "bg-white/80 hover:bg-white shadow-sm hover:shadow cursor-pointer dark:bg-gray-800/80 dark:hover:bg-gray-800",
                  "border border-gray-100 dark:border-gray-700",
                  "rounded-lg flex items-center justify-center relative",
                  totalUnreadCount > 0 && "text-purple-500"
                )}>
                  <Bell className="h-4 w-4" />
                  {totalUnreadCount > 0 && (
                    <Badge 
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-[10px]"
                    >
                      {totalUnreadCount}
                    </Badge>
                  )}
                </div>
              </MentionsPopover>
            </div>
          </div>
          <InterpreterChannelList 
            onChannelSelect={handleChannelSelect}
          />
        </Card>
      )}
      
      {(selectedChannelId && (!showChannels || !isMobile)) ? (
        <Card className={cn(
          "p-2 overflow-hidden backdrop-blur-sm relative transition-all duration-200",
          "bg-white/90 dark:bg-gray-800/90",
          "rounded-lg",
          "lg:col-span-2",
          isMobile && "fixed inset-0 z-50 m-0 rounded-none"
        )}>
          <InterpreterChat 
            channelId={selectedChannelId}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClearFilters={handleClearFilters}
          />
        </Card>
      ) : !selectedChannelId && !isMobile ? (
        <Card className="p-3 lg:col-span-2 flex items-center justify-center bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm transition-all duration-200 rounded-lg">
          <div className="text-center text-muted-foreground">
            <p className="text-base font-light animate-fade-in">Sélectionnez une conversation pour commencer à discuter</p>
          </div>
        </Card>
      ) : null}
    </div>
  );
};
