import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { RealtimeChannel, RealtimeChannelSendResponse } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RealtimeContextType {
  channel: RealtimeChannel | null;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  reconnect: () => Promise<void>;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};

interface RealtimeProviderProps {
  children: React.ReactNode;
}

export const RealtimeProvider: React.FC<RealtimeProviderProps> = ({ children }) => {
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();
  const lastHeartbeatRef = useRef<Date>();
  const isExplicitDisconnectRef = useRef(false);
  const { toast } = useToast();

  const cleanup = useCallback(() => {
    isExplicitDisconnectRef.current = true;
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  const setupHeartbeat = useCallback((channel: RealtimeChannel) => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(async () => {
      try {
        await channel.send({
          type: 'broadcast',
          event: 'heartbeat',
          payload: { timestamp: new Date().toISOString() }
        });
        lastHeartbeatRef.current = new Date();
        console.log('[RealtimeContext] Heartbeat sent successfully');
      } catch (error) {
        console.error('[RealtimeContext] Failed to send heartbeat:', error);
        if (!isExplicitDisconnectRef.current) {
          setConnectionStatus('disconnected');
          initializeChannel();
        }
      }
    }, 30000);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, []);

  const initializeChannel = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('[RealtimeContext] No active session, aborting connection');
        setConnectionStatus('disconnected');
        return;
      }

      setConnectionStatus('connecting');
      isExplicitDisconnectRef.current = false;

      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      channelRef.current = supabase.channel('app-presence', {
        config: {
          presence: { key: session.user.id },
        }
      });

      if (!channelRef.current) {
        console.error('[RealtimeContext] Failed to create channel');
        setConnectionStatus('disconnected');
        return;
      }

      channelRef.current
        .on('presence', { event: 'sync' }, () => {
          const state = channelRef.current?.presenceState();
          console.log('[RealtimeContext] Presence sync state:', state);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('[RealtimeContext] Join event:', { key, newPresences });
          lastHeartbeatRef.current = new Date();
        })
        .on('broadcast', { event: 'heartbeat' }, (payload) => {
          console.log('[RealtimeContext] Heartbeat received:', payload);
          lastHeartbeatRef.current = new Date();
        });

      await channelRef.current.subscribe(async (status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR') => {
        console.log('[RealtimeContext] Channel status:', status);

        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          setupHeartbeat(channelRef.current!);

          try {
            await channelRef.current?.track({
              online_at: new Date().toISOString(),
              status: 'online'
            });
          } catch (error) {
            console.error('[RealtimeContext] Error tracking presence:', error);
          }
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.error(`[RealtimeContext] Channel ${status}`);
          setConnectionStatus('disconnected');
          if (!isExplicitDisconnectRef.current) {
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
            }
            reconnectTimeoutRef.current = setTimeout(() => {
              initializeChannel();
            }, 5000);
          }
        }
      });
    } catch (error) {
      console.error('[RealtimeContext] Error initializing channel:', error);
      setConnectionStatus('disconnected');
      if (!isExplicitDisconnectRef.current) {
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          initializeChannel();
        }, 5000);
      }
    }
  }, [setupHeartbeat]);

  const reconnect = useCallback(async () => {
    cleanup();
    await initializeChannel();
  }, [cleanup, initializeChannel]);

  useEffect(() => {
    initializeChannel();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        reconnect();
      } else if (event === 'SIGNED_OUT') {
        cleanup();
      }
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && connectionStatus !== 'connected') {
        reconnect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cleanup();
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [cleanup, initializeChannel, reconnect, connectionStatus]);

  return (
    <RealtimeContext.Provider 
      value={{
        channel: channelRef.current,
        connectionStatus,
        reconnect
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
};
