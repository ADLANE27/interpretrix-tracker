
import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { ChannelList } from "./ChannelList";
import { ChannelMemberManagement } from "./ChannelMemberManagement";
import { CreateChannelDialog } from "./CreateChannelDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Chat } from "@/components/chat/Chat";
import { Maximize2, Minimize2, ArrowDown, Volume2, VolumeX, Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { playNotificationSound } from "@/utils/notificationSounds";
import { useIsMobile } from "@/hooks/use-mobile";
import { subscribeToPushNotifications, unsubscribeFromPushNotifications } from "@/lib/notificationUtils";
import { RealtimeChannel } from "@supabase/supabase-js";

export const MessagesTab = () => {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showChannels, setShowChannels] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Check admin status
  const { data: userRole } = useQuery({
    queryKey: ['userRole'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      return data?.role;
    }
  });

  const isAdmin = userRole === 'admin';

  const channelRef = useRef<RealtimeChannel | null>(null);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout>();

  const setupRealtimeSubscription = () => {
    console.log('[MessagesTab] Setting up realtime subscription');
    
    // Cleanup any existing subscription
    if (channelRef.current) {
      console.log('[MessagesTab] Removing existing channel');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Create a new channel with proper configuration
    channelRef.current = supabase.channel('mission-updates', {
      config: {
        broadcast: { self: true },
        presence: { key: 'mission-updates' },
      }
    });

    // Add subscription handlers
    channelRef.current
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'interpretation_missions'
        },
        async (payload: any) => {
          console.log('[MessagesTab] New mission created:', payload);
          
          if (payload.new) {
            const mission = payload.new;
            const isImmediate = mission.mission_type === 'immediate';
            
            toast({
              title: isImmediate ? "🚨 Nouvelle mission immédiate" : "📅 Nouvelle mission programmée",
              description: `${mission.source_language} → ${mission.target_language} - ${mission.estimated_duration} minutes`,
              variant: isImmediate ? "destructive" : "default",
              duration: 10000,
            });

            if (soundEnabled) {
              try {
                console.log('[MessagesTab] Playing notification sound for:', mission.mission_type);
                await playNotificationSound(mission.mission_type);
              } catch (error) {
                console.error('[MessagesTab] Error playing sound:', error);
              }
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[MessagesTab] Subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('[MessagesTab] Successfully subscribed to mission updates');
        }
        if (status === 'CHANNEL_ERROR') {
          console.error('[MessagesTab] Channel error, will retry in 5s');
          if (cleanupTimeoutRef.current) {
            clearTimeout(cleanupTimeoutRef.current);
          }
          cleanupTimeoutRef.current = setTimeout(() => {
            setupRealtimeSubscription();
          }, 5000);
        }
      });
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      console.log('[MessagesTab] Tab became visible, refreshing subscription');
      setupRealtimeSubscription();
    }
  };

  useEffect(() => {
    console.log('[MessagesTab] Component mounted');
    setupRealtimeSubscription();

    // Add visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup function
    return () => {
      console.log('[MessagesTab] Component unmounting, cleaning up');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }
      
      if (channelRef.current) {
        console.log('[MessagesTab] Removing channel subscription');
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []); // Empty dependency array since we want this to run once on mount

  const handleChannelSelect = (channelId: string) => {
    setSelectedChannelId(channelId);
  };

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
    setShowChannels(false);
  };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
    toast({
      title: soundEnabled ? "Sons désactivés" : "Sons activés",
      description: soundEnabled 
        ? "Les notifications sonores ont été désactivées" 
        : "Les notifications sonores ont été activées",
      duration: 3000,
    });
  };

  const toggleNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      if (notificationsEnabled) {
        const success = await unsubscribeFromPushNotifications(user.id);
        if (success) {
          setNotificationsEnabled(false);
        }
      } else {
        const success = await subscribeToPushNotifications(user.id);
        if (success) {
          setNotificationsEnabled(true);
        }
      }
    } catch (error) {
      console.error('[MessagesTab] Error toggling notifications:', error);
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue",
        variant: "destructive",
      });
    }
  };

  const scrollToBottom = () => {
    const chatContainer = document.querySelector('.chat-messages-container');
    if (chatContainer) {
      chatContainer.scrollTo({
        top: chatContainer.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  };

  return (
    <div className={cn(
      "transition-all duration-500 ease-in-out",
      isFullScreen 
        ? "fixed inset-0 z-50 bg-gradient-to-br from-white to-[#F8F9FA]" 
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
          "relative flex flex-col",
          isFullScreen 
            ? "w-full h-full p-0 rounded-none" 
            : "md:col-span-2 p-4"
        )}>
          <div className={cn(
            "absolute top-4 right-4 z-10 flex gap-2",
            isFullScreen && "top-6 right-6"
          )}>
            {showScrollButton && (
              <Button
                variant="outline"
                size="icon"
                onClick={scrollToBottom}
                className="bg-white/80 hover:bg-white shadow-sm hover:shadow border border-gray-100"
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={toggleNotifications}
              className="bg-white/80 hover:bg-white shadow-sm hover:shadow border border-gray-100"
              title={notificationsEnabled ? "Désactiver les notifications" : "Activer les notifications"}
            >
              {notificationsEnabled ? (
                <Bell className="h-4 w-4" />
              ) : (
                <BellOff className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleSound}
              className="bg-white/80 hover:bg-white shadow-sm hover:shadow border border-gray-100"
              title={soundEnabled ? "Désactiver les sons" : "Activer les sons"}
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </Button>
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
          <Chat channelId={selectedChannelId} onScroll={handleScroll} />
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
