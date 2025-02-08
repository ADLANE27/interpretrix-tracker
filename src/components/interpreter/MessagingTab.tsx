
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { InterpreterChannelList } from "./chat/InterpreterChannelList";
import { InterpreterChat } from "./chat/InterpreterChat";
import { MessageSquare, Menu } from "lucide-react";
import { HowToUseGuide } from "./HowToUseGuide";
import { useIsMobile } from "@/hooks/use-mobile";

export const MessagingTab = () => {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [showChannels, setShowChannels] = useState(true);
  const [filters, setFilters] = useState<{
    userId?: string;
    keyword?: string;
    date?: Date;
  }>({});
  const [isGuideOpen, setIsGuideOpen] = useState(false);
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6 h-[calc(100vh-300px)] min-h-[600px] relative">
      {isMobile && selectedChannelId && !showChannels && (
        <button
          onClick={toggleChannels}
          className="absolute top-2 left-2 z-10 p-2 rounded-full bg-white shadow-md"
        >
          <Menu className="h-5 w-5 text-interpreter-navy" />
        </button>
      )}

      {(!selectedChannelId || showChannels || !isMobile) && (
        <Card className="p-3 sm:p-4 lg:col-span-1 shadow-md border-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4 px-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-interpreter-navy" />
              <h2 className="text-lg font-semibold text-interpreter-navy">Messages</h2>
            </div>
            <HowToUseGuide isOpen={isGuideOpen} onOpenChange={setIsGuideOpen} />
          </div>
          <InterpreterChannelList 
            onChannelSelect={handleChannelSelect}
          />
        </Card>
      )}
      
      {(selectedChannelId && (!showChannels || !isMobile)) ? (
        <Card className="p-3 sm:p-4 lg:col-span-2 shadow-md border-0 overflow-hidden">
          <InterpreterChat 
            channelId={selectedChannelId}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClearFilters={handleClearFilters}
          />
        </Card>
      ) : !selectedChannelId && !isMobile ? (
        <Card className="p-3 sm:p-4 lg:col-span-2 shadow-md border-0 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Sélectionnez une conversation pour commencer à discuter</p>
          </div>
        </Card>
      ) : null}
    </div>
  );
};
