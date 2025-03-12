import { useState } from "react";
import { Card } from "@/components/ui/card";
import { InterpreterChannelList } from "./chat/InterpreterChannelList";
import { InterpreterChat } from "./chat/InterpreterChat";
import { useIsMobile } from "@/hooks/use-mobile";
import { Bell, ChevronLeft } from "lucide-react";
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
    <div className="grid grid-cols-1 lg:grid-cols-3 h-[calc(100vh-120px)] overflow-hidden">
      {(!selectedChannelId || showChannels || !isMobile) && (
        <Card className={cn(
          "relative p-2 sm:p-4 lg:col-span-1 border-r border-r-border rounded-none shadow-none h-full overflow-hidden",
          "bg-gradient-to-br from-[#FFFFFF] to-[#F8F9FA] backdrop-blur-sm",
          "dark:from-gray-800 dark:to-gray-900",
          isMobile && "fixed inset-0 z-50 m-0"
        )}>
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-2 sm:mb-4 px-2">
              <h2 className="text-base sm:text-lg font-semibold">Conversations</h2>
              <MentionsPopover
                mentions={unreadMentions}
                totalCount={totalUnreadCount}
                onMentionClick={handleMentionClick}
                onMarkAsRead={markMentionAsRead}
                onDelete={deleteMention}
              >
                <div className={cn(
                  "transition-all duration-200 p-1.5 sm:p-2",
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
            <div className="flex-1 overflow-hidden">
              <InterpreterChannelList 
                onChannelSelect={handleChannelSelect}
              />
            </div>
          </div>
        </Card>
      )}
      
      {(selectedChannelId && (!showChannels || !isMobile)) ? (
        <Card className={cn(
          "flex flex-col h-full lg:col-span-2 p-0 shadow-none border-0 overflow-hidden backdrop-blur-sm",
          "bg-gradient-to-br from-[#FFFFFF] to-[#F8F9FA] dark:from-gray-800 dark:to-gray-900",
          isMobile && "fixed inset-0 z-50 m-0 rounded-none"
        )}>
          {isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowChannels(true)}
              className="absolute top-2 left-2 z-10 h-8 px-2"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
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
      ) : !selectedChannelId && !isMobile ? (
        <Card className="p-3 sm:p-4 lg:col-span-2 shadow-lg border-0 flex items-center justify-center bg-gradient-to-br from-[#FFFFFF] to-[#F8F9FA] backdrop-blur-sm transition-all duration-300 hover:shadow-xl rounded-xl dark:from-gray-800 dark:to-gray-900">
          <div className="text-center text-muted-foreground">
            <p className="text-base sm:text-lg font-light animate-fade-in">Sélectionnez une conversation pour commencer à discuter</p>
          </div>
        </Card>
      ) : null}
    </div>
  );
};

export default MessagingTab;
