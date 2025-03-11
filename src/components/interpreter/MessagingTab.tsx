
import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { InterpreterChannelList } from "./chat/InterpreterChannelList";
import { InterpreterChat } from "./chat/InterpreterChat";
import { useIsMobile } from "@/hooks/use-mobile";
import { Bell, ChevronLeft, Menu } from "lucide-react";
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

  const handleBackToChannels = () => {
    setSelectedChannelId(null);
    setShowChannels(true);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6 h-[calc(100vh-300px)] min-h-[500px] relative">
      {/* Channel List */}
      {(!selectedChannelId || showChannels || !isMobile) && (
        <Card className={cn(
          "relative overflow-hidden",
          "bg-gradient-to-br from-interpreter-navy/5 to-white dark:from-interpreter-navy/20 dark:to-gray-800",
          "backdrop-blur-xl border-0 shadow-lg",
          "transition-all duration-300 hover:shadow-xl",
          "p-2 sm:p-4 lg:col-span-1",
          isMobile && "fixed inset-0 z-[35] m-0"
        )}>
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-2">
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden hover:bg-interpreter-navy/10 dark:hover:bg-gray-700/50"
                  onClick={() => setShowChannels(false)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
              )}
              <h2 className="text-base sm:text-lg font-semibold bg-gradient-to-r from-interpreter-navy to-interpreter-navy/80 dark:from-interpreter-navy/90 dark:to-interpreter-navy/70 bg-clip-text text-transparent">
                Conversations
              </h2>
            </div>
            <MentionsPopover
              mentions={unreadMentions}
              totalCount={totalUnreadCount}
              onMentionClick={handleMentionClick}
              onMarkAsRead={markMentionAsRead}
              onDelete={deleteMention}
            >
              <div className={cn(
                "transition-all duration-200",
                "bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-700",
                "shadow-sm hover:shadow-md",
                "border border-interpreter-navy/10 dark:border-gray-700",
                "rounded-full p-2",
                "flex items-center justify-center relative",
                totalUnreadCount > 0 && "text-interpreter-navy"
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
      
      {/* Chat Area */}
      {(selectedChannelId && (!showChannels || !isMobile)) ? (
        <Card className={cn(
          "relative overflow-hidden",
          "bg-gradient-to-br from-white to-orange-50/90 dark:from-gray-800 dark:to-gray-900/90",
          "backdrop-blur-xl border-0 shadow-lg",
          "transition-all duration-300 hover:shadow-xl",
          "p-2 sm:p-4 lg:col-span-2",
          isMobile && "fixed inset-0 z-[45] m-0"
        )}>
          {isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToChannels}
              className="absolute top-2 left-2 z-10 h-8 px-2 hover:bg-interpreter-navy/10 dark:hover:bg-gray-700/50"
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
            onBack={handleBackToChannels}
          />
        </Card>
      ) : !selectedChannelId && !isMobile ? (
        <Card className={cn(
          "flex items-center justify-center",
          "bg-gradient-to-br from-white to-orange-50/90 dark:from-gray-800 dark:to-gray-900/90",
          "backdrop-blur-xl border-0 shadow-lg",
          "transition-all duration-300 hover:shadow-xl",
          "p-3 sm:p-4 lg:col-span-2"
        )}>
          <div className="text-center text-muted-foreground">
            <p className="text-base sm:text-lg font-light animate-fade-in">
              Sélectionnez une conversation pour commencer à discuter
            </p>
          </div>
        </Card>
      ) : null}
    </div>
  );
};
