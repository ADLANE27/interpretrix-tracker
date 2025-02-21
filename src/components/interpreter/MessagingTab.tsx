import { useState } from "react";
import { Card } from "@/components/ui/card";
import { InterpreterChannelList } from "./chat/InterpreterChannelList";
import { InterpreterChat } from "./chat/InterpreterChat";
import { useIsMobile } from "@/hooks/use-mobile";
import { Maximize2, Minimize2, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MentionsPopover } from "@/components/chat/MentionsPopover";
import { useUnreadMentions } from "@/hooks/chat/useUnreadMentions";
import { Badge } from "@/components/ui/badge";

export const MessagingTab = () => {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [showChannels, setShowChannels] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
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

  const toggleChannels = () => {
    setShowChannels(!showChannels);
  };

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
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

  if (isFullScreen && selectedChannelId) {
    return (
      <div className="fixed inset-0 z-[100] bg-white dark:bg-gray-900">
        <div className="h-screen w-full">
          <InterpreterChat 
            channelId={selectedChannelId}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClearFilters={handleClearFilters}
            isFullScreen={true}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6 h-[calc(100vh-300px)] min-h-[600px] relative">
      {(!selectedChannelId || showChannels || !isMobile) && (
        <Card className="p-3 sm:p-4 lg:col-span-1 shadow-lg border-0 overflow-hidden bg-gradient-to-br from-[#FFFFFF] to-[#F8F9FA] backdrop-blur-sm transition-all duration-300 hover:shadow-xl rounded-xl dark:from-gray-800 dark:to-gray-900">
          <InterpreterChannelList 
            onChannelSelect={handleChannelSelect}
          />
        </Card>
      )}
      
      {(selectedChannelId && (!showChannels || !isMobile)) ? (
        <Card className={cn(
          "p-3 sm:p-4 shadow-lg border-0 overflow-hidden backdrop-blur-sm relative transition-all duration-300",
          "bg-gradient-to-br from-[#FFFFFF] to-[#F8F9FA] dark:from-gray-800 dark:to-gray-900",
          "hover:shadow-xl rounded-xl",
          "lg:col-span-2"
        )}>
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            <MentionsPopover
              mentions={unreadMentions}
              totalCount={totalUnreadCount}
              onMentionClick={handleMentionClick}
              onMarkAsRead={markMentionAsRead}
              onDelete={deleteMention}
            >
              <div className={cn(
                "transition-all duration-200 p-2",
                "bg-white/80 hover:bg-white shadow-sm hover:shadow cursor-pointer dark:bg-gray-800/80 dark:hover:bg-gray-800",
                "border border-gray-100 dark:border-gray-700",
                "rounded-lg flex items-center justify-center relative",
                totalUnreadCount > 0 && "text-purple-500"
              )}>
                <Bell className="h-4 w-4" />
                {totalUnreadCount > 0 && (
                  <Badge 
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {totalUnreadCount}
                  </Badge>
                )}
              </div>
            </MentionsPopover>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullScreen}
              className={cn(
                "transition-all duration-200",
                "bg-white/80 hover:bg-white shadow-sm hover:shadow dark:bg-gray-800/80 dark:hover:bg-gray-800",
                "border border-gray-100 dark:border-gray-700",
                "rounded-lg",
                "hover:bg-purple-50 hover:text-purple-500 dark:hover:bg-purple-900/20"
              )}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
          <InterpreterChat 
            channelId={selectedChannelId}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClearFilters={handleClearFilters}
            isFullScreen={false}
          />
        </Card>
      ) : !selectedChannelId && !isMobile ? (
        <Card className="p-3 sm:p-4 lg:col-span-2 shadow-lg border-0 flex items-center justify-center bg-gradient-to-br from-[#FFFFFF] to-[#F8F9FA] backdrop-blur-sm transition-all duration-300 hover:shadow-xl rounded-xl dark:from-gray-800 dark:to-gray-900">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-light animate-fade-in">Sélectionnez une conversation pour commencer à discuter</p>
          </div>
        </Card>
      ) : null}
    </div>
  );
};
