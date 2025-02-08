
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ChannelList } from "./ChannelList";
import { ChannelMemberManagement } from "./ChannelMemberManagement";
import { CreateChannelDialog } from "./CreateChannelDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Chat } from "@/components/chat/Chat";
import { Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const MessagesTab = () => {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showChannels, setShowChannels] = useState(true);

  // Check if user is admin
  const { data: isAdmin } = useQuery({
    queryKey: ['isUserAdmin'],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);
      
      return roles?.some(r => r.role === 'admin') || false;
    }
  });

  const handleChannelSelect = (channelId: string) => {
    setSelectedChannelId(channelId);
  };

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
    setShowChannels(false);
  };

  return (
    <div className={cn(
      "transition-all duration-500 ease-in-out",
      isFullScreen 
        ? "fixed inset-0 z-50 bg-gradient-to-br from-white to-[#F8F9FA] p-4" 
        : "grid grid-cols-1 md:grid-cols-3 gap-4"
    )}>
      {(!selectedChannelId || showChannels || !isFullScreen) && (
        <Card className={cn(
          "p-4",
          isFullScreen ? "hidden" : "md:col-span-1"
        )}>
          <ChannelList 
            onChannelSelect={handleChannelSelect}
          />
        </Card>
      )}
      
      {selectedChannelId && (
        <Card className={cn(
          "p-4 relative",
          isFullScreen ? "w-full h-full" : "md:col-span-2"
        )}>
          <div className="absolute top-4 right-4 z-10">
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
          <Chat channelId={selectedChannelId} />
        </Card>
      )}
      
      {selectedChannelId && (
        <ChannelMemberManagement
          channelId={selectedChannelId}
          isOpen={isMembersDialogOpen}
          onClose={() => setIsMembersDialogOpen(false)}
        />
      )}
      
      {isAdmin && (
        <CreateChannelDialog
          isOpen={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
          onChannelCreated={() => {
            setIsCreateDialogOpen(false);
          }}
        />
      )}
    </div>
  );
};
