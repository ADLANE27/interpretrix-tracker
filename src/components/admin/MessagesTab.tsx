
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { ChannelList } from "./ChannelList";
import { ChannelMemberManagement } from "./ChannelMemberManagement";
import { CreateChannelDialog } from "./CreateChannelDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Chat } from "@/components/chat/Chat";
import { Maximize2, Minimize2, ArrowDown, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { playNotificationSound } from "@/utils/notificationSounds";
import { useIsMobile } from "@/hooks/use-mobile";

export const MessagesTab = () => {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showChannels, setShowChannels] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundInitialized, setSoundInitialized] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

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

  const initializeSound = () => {
    if (!soundInitialized) {
      console.log('[MessagesTab] Initializing sounds...');
      // Create and play a silent buffer to enable audio
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const buffer = audioContext.createBuffer(1, 1, 22050);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start(0);
      setSoundInitialized(true);
      
      // Force preload the notification sounds
      playNotificationSound('immediate', true);
      playNotificationSound('scheduled', true);
      
      console.log('[MessagesTab] Sounds initialized');
    }
  };

  const handleChannelSelect = (channelId: string) => {
    setSelectedChannelId(channelId);
    initializeSound();
  };

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
    setShowChannels(false);
    initializeSound();
  };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
    initializeSound();
    toast({
      title: soundEnabled ? "Sons désactivés" : "Sons activés",
      description: soundEnabled 
        ? "Les notifications sonores ont été désactivées" 
        : "Les notifications sonores ont été activées",
      duration: 3000,
    });
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

  useEffect(() => {
    console.log('[MessagesTab] Setting up user interaction listeners');
    const handleUserInteraction = () => {
      console.log('[MessagesTab] User interaction detected, initializing sound');
      initializeSound();
      // Remove event listeners after first interaction
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };

    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, []);

  useEffect(() => {
    console.log('[MessagesTab] Setting up realtime subscription...');
    const channel = supabase
      .channel('realtime-mission-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'interpretation_missions'
        },
        async (payload: any) => {
          console.log('[MessagesTab] New mission update:', payload);
          
          if (payload.eventType === 'INSERT') {
            const mission = payload.new as any;
            
            if (!mission) {
              console.error('[MessagesTab] Invalid mission payload');
              return;
            }

            const isImmediate = mission.mission_type === 'immediate';
            
            // Show toast notification with longer duration for mobile
            console.log('[MessagesTab] Showing toast notification');
            toast({
              title: isImmediate ? "🚨 Nouvelle mission immédiate" : "📅 Nouvelle mission programmée",
              description: `${mission.source_language} → ${mission.target_language} - ${mission.estimated_duration} minutes`,
              variant: isImmediate ? "destructive" : "default",
              duration: 10000, // Longer duration for better visibility
            });

            // Play sound if enabled and initialized
            if (soundEnabled && soundInitialized) {
              try {
                console.log('[MessagesTab] Attempting to play sound for:', mission.mission_type);
                await playNotificationSound(mission.mission_type);
              } catch (error) {
                console.error('[MessagesTab] Error playing sound:', error);
                // Try to reinitialize sound on error
                console.log('[MessagesTab] Attempting to reinitialize sound');
                initializeSound();
                // Retry playing sound once
                try {
                  await playNotificationSound(mission.mission_type);
                } catch (retryError) {
                  console.error('[MessagesTab] Retry failed:', retryError);
                }
              }
            } else {
              console.log('[MessagesTab] Sound not played - enabled:', soundEnabled, 'initialized:', soundInitialized);
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
          console.error('[MessagesTab] Error subscribing to mission updates');
          toast({
            title: "Erreur",
            description: "Impossible de recevoir les mises à jour en temps réel",
            variant: "destructive",
          });
        }
      });

    return () => {
      console.log('[MessagesTab] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [soundEnabled, soundInitialized, toast, isMobile]);

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
          <div className="absolute top-4 right-4 z-10 flex gap-2">
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

