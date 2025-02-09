
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { InterpreterChannelList } from "./chat/InterpreterChannelList";
import { InterpreterChat } from "./chat/InterpreterChat";
import { useIsMobile } from "@/hooks/use-mobile";
import { Maximize2, Minimize2, Bell, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MentionsPopover } from "@/components/chat/MentionsPopover";
import { useUnreadMentions } from "@/hooks/chat/useUnreadMentions";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export const MessagingTab = () => {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [showChannels, setShowChannels] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
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
    setShowChannels(false);
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
    <div 
      className={cn(
        "transition-all duration-500 ease-in-out flex",
        isFullScreen 
          ? "fixed inset-0 z-50 bg-gradient-to-br from-white to-[#F8F9FA]" 
          : "h-[calc(100vh-200px)] min-h-[700px] relative"
      )}
    >
      {(!selectedChannelId || showChannels || !isMobile) && !isFullScreen && (
        <div className="flex items-start">
          <Collapsible
            open={!isCollapsed}
            onOpenChange={setIsCollapsed}
          >
            <CollapsibleContent className="w-[300px] lg:w-[350px] transition-all duration-300">
              <Card className="p-3 sm:p-4 shadow-lg border-0 overflow-hidden bg-gradient-to-br from-[#FFFFFF] to-[#F8F9FA] backdrop-blur-sm transition-all duration-300 hover:shadow-xl rounded-xl h-full">
                <InterpreterChannelList 
                  onChannelSelect={handleChannelSelect}
                />
              </Card>
            </CollapsibleContent>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 bg-white shadow-md hover:bg-gray-100 -mr-4 z-10 mt-4"
              >
                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        </div>
      )}
      
      {(selectedChannelId && (!showChannels || !isMobile)) ? (
        <Card className={cn(
          "p-3 sm:p-4 shadow-lg border-0 overflow-hidden backdrop-blur-sm relative transition-all duration-300",
          "bg-gradient-to-br from-[#FFFFFF] to-[#F8F9FA]",
          "hover:shadow-xl rounded-xl flex-1",
          isCollapsed ? "ml-0" : "ml-4",
          isFullScreen ? "w-full h-full" : ""
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
                "bg-white/80 hover:bg-white shadow-sm hover:shadow cursor-pointer",
                "border border-gray-100",
                "rounded-lg flex items-center justify-center",
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
                "bg-white/80 hover:bg-white shadow-sm hover:shadow",
                "border border-gray-100",
                "rounded-lg",
                isFullScreen ? "hover:bg-red-50 hover:text-red-500" : "hover:bg-purple-50 hover:text-purple-500"
              )}
            >
              {isFullScreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
          <InterpreterChat 
            channelId={selectedChannelId}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClearFilters={handleClearFilters}
            isFullScreen={isFullScreen}
          />
        </Card>
      ) : !selectedChannelId && !isMobile && !isFullScreen ? (
        <Card className="flex-1 p-3 sm:p-4 shadow-lg border-0 flex items-center justify-center bg-gradient-to-br from-[#FFFFFF] to-[#F8F9FA] backdrop-blur-sm transition-all duration-300 hover:shadow-xl rounded-xl">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-light animate-fade-in">Sélectionnez une conversation pour commencer à discuter</p>
          </div>
        </Card>
      ) : null}
    </div>
  );
};

