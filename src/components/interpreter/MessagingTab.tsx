
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { InterpreterChannelList } from "./chat/InterpreterChannelList";
import { InterpreterChat } from "./chat/InterpreterChat";
import { useIsMobile } from "@/hooks/use-mobile";
import { Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

  return (
    <div 
      className={cn(
        "transition-all duration-500 ease-in-out",
        isFullScreen 
          ? "fixed inset-0 z-50 bg-gradient-to-br from-white to-[#F8F9FA]" 
          : "grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6 h-[calc(100vh-300px)] min-h-[600px] relative"
      )}
    >
      {(!selectedChannelId || showChannels || !isMobile) && !isFullScreen && (
        <Card className="p-3 sm:p-4 lg:col-span-1 shadow-lg border-0 overflow-hidden bg-gradient-to-br from-[#FFFFFF] to-[#F8F9FA] backdrop-blur-sm transition-all duration-300 hover:shadow-xl rounded-xl">
          <InterpreterChannelList 
            onChannelSelect={handleChannelSelect}
          />
        </Card>
      )}
      
      {(selectedChannelId && (!showChannels || !isMobile)) ? (
        <Card className={cn(
          "p-3 sm:p-4 shadow-lg border-0 overflow-hidden backdrop-blur-sm relative transition-all duration-300",
          "bg-gradient-to-br from-[#FFFFFF] to-[#F8F9FA]",
          "hover:shadow-xl rounded-xl",
          isFullScreen ? "w-full h-full" : "lg:col-span-2"
        )}>
          <div className="absolute top-4 right-4 z-10">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullScreen}
              className="hover:bg-white/50 transition-colors duration-200"
            >
              {isFullScreen ? (
                <Minimize2 className="h-4 w-4 text-gray-500" />
              ) : (
                <Maximize2 className="h-4 w-4 text-gray-500" />
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
        <Card className="p-3 sm:p-4 lg:col-span-2 shadow-lg border-0 flex items-center justify-center bg-gradient-to-br from-[#FFFFFF] to-[#F8F9FA] backdrop-blur-sm transition-all duration-300 hover:shadow-xl rounded-xl">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-light animate-fade-in">Sélectionnez une conversation pour commencer à discuter</p>
          </div>
        </Card>
      ) : null}
    </div>
  );
};
