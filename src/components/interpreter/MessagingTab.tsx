
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
    <div className="flex-1 h-full">
      <div className="container mx-auto p-0 sm:p-4 h-full pt-[180px] md:pt-[140px]">
        <Card className="shadow-sm border-0 sm:border bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm h-full sm:rounded-xl">
          <div className={cn(
            "flex flex-col gap-3 sm:gap-6 h-full",
            "lg:grid lg:grid-cols-3"
          )}>
            {(selectedChannelId && (!showChannels || !isMobile)) ? (
              <Card className={cn(
                "p-2 sm:p-4 shadow-lg border-0 overflow-hidden backdrop-blur-sm relative transition-all duration-300",
                "bg-gradient-to-br from-[#FFFFFF] to-[#F8F9FA] dark:from-gray-800 dark:to-gray-900",
                "hover:shadow-xl rounded-lg order-1",
                "lg:col-span-2",
                isMobile && "fixed inset-0 z-30 m-0 rounded-none"
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
              <Card className="p-3 sm:p-4 lg:col-span-2 shadow-lg border-0 flex items-center justify-center bg-gradient-to-br from-[#FFFFFF] to-[#F8F9FA] backdrop-blur-sm transition-all duration-300 hover:shadow-xl rounded-xl dark:from-gray-800 dark:to-gray-900 order-1">
                <div className="text-center text-muted-foreground">
                  <p className="text-base sm:text-lg font-light animate-fade-in">Sélectionnez une conversation pour commencer à discuter</p>
                </div>
              </Card>
            ) : null}

            {(!selectedChannelId || showChannels || !isMobile) && (
              <Card className={cn(
                "p-2 sm:p-4 lg:col-span-1 shadow-lg border-0 overflow-hidden",
                "bg-gradient-to-br from-[#FFFFFF] to-[#F8F9FA] backdrop-blur-sm",
                "transition-all duration-300 hover:shadow-xl rounded-lg",
                "dark:from-gray-800 dark:to-gray-900",
                "order-2",
                isMobile && "h-full"
              )}>
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
                <InterpreterChannelList 
                  onChannelSelect={handleChannelSelect}
                />
              </Card>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
