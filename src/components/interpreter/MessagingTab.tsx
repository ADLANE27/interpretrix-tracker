
import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { InterpreterChannelList } from "./chat/InterpreterChannelList";
import { InterpreterChat } from "./chat/InterpreterChat";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChevronLeft, Bell } from "lucide-react";
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

  const handleClearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const handleChannelSelect = (channelId: string) => {
    setSelectedChannelId(channelId);
    handleClearFilters();
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
    <div className="flex flex-col h-[calc(100dvh-80px)] sm:h-[calc(100dvh-300px)] min-h-[400px] relative">
      <div className="flex-1 relative overflow-hidden">
        {(!selectedChannelId || showChannels || !isMobile) && (
          <Card className={cn(
            "absolute inset-0 z-20 flex flex-col h-full",
            "bg-gradient-to-br from-[#FFFFFF] to-[#F8F9FA]",
            "dark:from-gray-800 dark:to-gray-900",
            "transition-all duration-300",
            !isMobile && "lg:relative lg:z-0 lg:w-[380px]"
          )}>
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Conversations</h2>
              <MentionsPopover
                mentions={unreadMentions}
                totalCount={totalUnreadCount}
                onMentionClick={handleMentionClick}
                onMarkAsRead={markMentionAsRead}
                onDelete={deleteMention}
              >
                <div className={cn(
                  "transition-all duration-200 p-2",
                  "bg-white/80 hover:bg-white shadow-sm hover:shadow cursor-pointer",
                  "dark:bg-gray-800/80 dark:hover:bg-gray-800",
                  "border border-gray-100 dark:border-gray-700 rounded-lg",
                  "flex items-center justify-center relative",
                  totalUnreadCount > 0 && "text-purple-500"
                )}>
                  <Bell className="h-5 w-5" />
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
            <div className="flex-1 overflow-hidden">
              <InterpreterChannelList 
                onChannelSelect={handleChannelSelect}
              />
            </div>
          </Card>
        )}
        
        {selectedChannelId && (!showChannels || !isMobile) && (
          <Card className={cn(
            "absolute inset-0 z-10 flex flex-col h-full",
            "bg-gradient-to-br from-[#FFFFFF] to-[#F8F9FA]",
            "dark:from-gray-800 dark:to-gray-900",
            "lg:relative lg:flex-1"
          )}>
            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowChannels(true)}
                className="absolute top-3 left-3 z-20 h-8 px-2 gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Retour
              </Button>
            )}
            <InterpreterChat 
              channelId={selectedChannelId}
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClearFilters={handleClearFilters}
            />
          </Card>
        )}
      </div>
    </div>
  );
};
