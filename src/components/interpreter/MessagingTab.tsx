import { useState } from "react";
import { Card } from "@/components/ui/card";
import { InterpreterChannelList } from "./chat/InterpreterChannelList";
import { InterpreterChat } from "./chat/InterpreterChat";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUnreadMentions } from "@/hooks/chat/useUnreadMentions";

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
    <div className="h-[calc(100vh-120px)] w-full overflow-hidden bg-background">
      <div className="container mx-auto h-full p-0 sm:p-4">
        <Card className="h-full shadow-sm border-0 sm:border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:rounded-lg">
          <div className={cn(
            "flex flex-col gap-3 sm:gap-6 h-full",
            "lg:grid lg:grid-cols-3"
          )}>
            {(!selectedChannelId || showChannels || !isMobile) && (
              <Card className={cn(
                "p-2 sm:p-4 lg:col-span-1 shadow-lg border-0 overflow-hidden h-full",
                "bg-card/50 backdrop-blur-sm",
                "transition-all duration-300 hover:shadow-xl rounded-lg",
                "order-2",
                isMobile && "h-full"
              )}>
                <InterpreterChannelList 
                  onChannelSelect={handleChannelSelect}
                />
              </Card>
            )}

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
          </div>
        </Card>
      </div>
    </div>
  );
};
