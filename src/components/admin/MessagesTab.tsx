
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Chat from "@/components/chat/Chat";
import { ChannelList } from "@/components/admin/ChannelList";
import { MentionsPopover } from "@/components/admin/MentionsPopover";
import { CreateChannelDialog } from "@/components/admin/CreateChannelDialog";
import { NewDirectMessageDialog } from "@/components/admin/NewDirectMessageDialog";
import { Plus, Users, MessageCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChannelMemberManagement } from "@/components/admin/ChannelMemberManagement";
import { supabase } from "@/integrations/supabase/client";
import { useUnreadMentions } from "@/hooks/chat/useUnreadMentions";

export const MessagesTab = () => {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [isCreateChannelDialogOpen, setIsCreateChannelDialogOpen] = useState(false);
  const [isDirectMessageDialogOpen, setIsDirectMessageDialogOpen] = useState(false);
  const [isAddMembersMode, setIsAddMembersMode] = useState(false);
  const [isChannelReady, setIsChannelReady] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("channels");
  const [messageToScrollTo, setMessageToScrollTo] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshMentions } = useUnreadMentions();

  // Refresh mentions regularly to ensure notifications appear
  useEffect(() => {
    // Initial fetch
    refreshMentions();
    
    // Set up regular refresh interval
    const intervalId = setInterval(() => {
      refreshMentions();
    }, 30000); // Every 30 seconds
    
    return () => clearInterval(intervalId);
  }, [refreshMentions]);

  // Check for channel and message ID in URL parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const channelId = searchParams.get("channelId");
    const messageId = searchParams.get("messageId");
    
    if (channelId) {
      setSelectedChannelId(channelId);
      
      if (messageId) {
        setMessageToScrollTo(messageId);
      }
    }
  }, [location.search]);

  // This ensures we're not trying to render the chat component until we've verified
  // that the user has access to the selected channel
  useEffect(() => {
    const checkChannelAccess = async () => {
      if (!selectedChannelId) {
        setIsChannelReady(false);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsChannelReady(false);
          return;
        }

        // Check if the user is a member of this channel
        const { data } = await supabase
          .from('channel_members')
          .select('*')
          .eq('channel_id', selectedChannelId)
          .eq('user_id', user.id)
          .single();

        setIsChannelReady(!!data);
      } catch (error) {
        console.error("Error checking channel access:", error);
        setIsChannelReady(false);
      }
    };

    checkChannelAccess();
  }, [selectedChannelId]);

  const handleChannelSelect = (channelId: string) => {
    setSelectedChannelId(channelId);
    setIsAddMembersMode(false);
    
    // Update URL with the selected channel
    navigate(`/admin?tab=messages&channelId=${channelId}`);
  };

  const handleCreateChannelSuccess = (channelId: string) => {
    setIsCreateChannelDialogOpen(false);
    setSelectedChannelId(channelId);
  };

  const handleDirectMessageSuccess = (channelId: string) => {
    setIsDirectMessageDialogOpen(false);
    setSelectedChannelId(channelId);
  };

  const handleManageMembers = () => {
    setIsAddMembersMode(true);
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar with Channel List */}
      <div className="w-72 border-r flex flex-col h-full">
        <div className="p-4 border-b flex items-center justify-between">
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="channels">Canaux</TabsTrigger>
              <TabsTrigger value="direct">Messages</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <div className="flex items-center justify-between p-4">
          <h3 className="font-medium">
            {activeTab === "channels" ? "Canaux de groupe" : "Messages directs"}
          </h3>
          <div className="flex space-x-1">
            <MentionsPopover />
            
            {activeTab === "channels" ? (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsCreateChannelDialogOpen(true)}
                title="Nouveau canal"
              >
                <Plus className="h-4 w-4" />
              </Button>
            ) : (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsDirectMessageDialogOpen(true)}
                title="Nouveau message"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        <div className="flex-1 overflow-auto">
          <ChannelList 
            onChannelSelect={handleChannelSelect}
            activeType={activeTab}
          />
        </div>
      </div>
      
      {/* Main chat area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {selectedChannelId && isChannelReady ? (
          isAddMembersMode ? (
            <ChannelMemberManagement 
              channelId={selectedChannelId}
              onClose={() => setIsAddMembersMode(false)}
            />
          ) : (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="text-lg font-semibold">Chat</h2>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleManageMembers}
                  className="flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  <span>Gérer les membres</span>
                </Button>
              </div>
              <div className="flex-1 overflow-hidden">
                <Chat channelId={selectedChannelId} messageToScrollTo={messageToScrollTo} />
              </div>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <MessageCircle className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Aucun canal sélectionné</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              Sélectionnez un canal existant ou créez-en un nouveau pour commencer à discuter.
            </p>
            <div className="flex gap-4">
              <Button onClick={() => setIsCreateChannelDialogOpen(true)}>
                Créer un canal
              </Button>
              <Button variant="outline" onClick={() => setIsDirectMessageDialogOpen(true)}>
                Message direct
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Dialogs */}
      <CreateChannelDialog 
        isOpen={isCreateChannelDialogOpen} 
        onClose={() => setIsCreateChannelDialogOpen(false)}
        onChannelCreated={() => handleCreateChannelSuccess(selectedChannelId || '')}
      />
      
      <NewDirectMessageDialog
        isOpen={isDirectMessageDialogOpen}
        onClose={() => setIsDirectMessageDialogOpen(false)}
        onChannelCreated={() => handleDirectMessageSuccess(selectedChannelId || '')}
      />
    </div>
  );
};
