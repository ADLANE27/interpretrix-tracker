import { useEffect, useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import AdminDashboard from '@/components/admin/AdminDashboard';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useMissionUpdates } from '@/hooks/useMissionUpdates';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { eventEmitter, EVENT_CONNECTION_STATUS_CHANGE } from '@/lib/events';

const Admin = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [connectionError, setConnectionError] = useState(false);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const connectionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSuccessfulConnectionRef = useRef<number>(Date.now());

  // Add the useMissionUpdates hook to refresh data when interpreter statuses change
  useMissionUpdates(() => {
    // Reset connection error state on successful updates
    if (connectionError) {
      setConnectionError(false);
      eventEmitter.emit(EVENT_CONNECTION_STATUS_CHANGE, true);
    }
    reconnectAttemptRef.current = 0;
    lastSuccessfulConnectionRef.current = Date.now();
  });

  // Improved connection health monitoring
  useEffect(() => {
    const checkConnection = () => {
      // If there are no active channels, it might indicate a connection issue
      const channels = supabase.getChannels();
      const connected = channels.length > 0 && 
        channels.some((channel: RealtimeChannel) => channel.state === 'joined');
      
      const timeSinceLastSuccess = Date.now() - lastSuccessfulConnectionRef.current;
      const connectionTimeout = 30000; // 30 seconds
      
      if (!connected || timeSinceLastSuccess > connectionTimeout) {
        // Only show reconnection message after failed attempts
        if (!connectionError && reconnectAttemptRef.current >= 1) {
          setConnectionError(true);
          eventEmitter.emit(EVENT_CONNECTION_STATUS_CHANGE, false);
        }
        
        // Try to reconnect by subscribing to a health check channel
        const healthChannel = supabase.channel('admin-connection-health-check');
        healthChannel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setConnectionError(false);
            eventEmitter.emit(EVENT_CONNECTION_STATUS_CHANGE, true);
            reconnectAttemptRef.current = 0;
            lastSuccessfulConnectionRef.current = Date.now();
            supabase.removeChannel(healthChannel);
          }
        });
        
        reconnectAttemptRef.current += 1;
      } else if (connected && connectionError) {
        setConnectionError(false);
        eventEmitter.emit(EVENT_CONNECTION_STATUS_CHANGE, true);
        reconnectAttemptRef.current = 0;
        lastSuccessfulConnectionRef.current = Date.now();
      }
    };

    // Check every 10 seconds
    connectionCheckIntervalRef.current = setInterval(checkConnection, 10000);

    // Also set up a heartbeat channel to maintain connection
    const heartbeatChannel = supabase.channel('admin-heartbeat-channel')
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          lastSuccessfulConnectionRef.current = Date.now();
        }
      });

    // Initial check
    checkConnection();

    return () => {
      if (connectionCheckIntervalRef.current) {
        clearInterval(connectionCheckIntervalRef.current);
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      supabase.removeChannel(heartbeatChannel);
    };
  }, [connectionError]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('[Admin] No user found, redirecting to login');
          navigate('/admin/login');
          return;
        }

        // Check if user has admin role
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (roles?.role !== 'admin') {
          console.log('[Admin] User is not an admin, redirecting to login');
          await supabase.auth.signOut();
          navigate('/admin/login');
          return;
        }
      } catch (error) {
        console.error('[Admin] Auth check error:', error);
        navigate('/admin/login');
      }
    };

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user || event === 'SIGNED_OUT') {
        navigate('/admin/login');
      }
    });

    // Initial auth check
    checkAuth();

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="h-screen w-full bg-gradient-to-br from-[#1a2844] to-[#0f172a] transition-colors duration-300 overflow-hidden">
      {connectionError && (
        <div className="fixed top-4 right-4 bg-amber-100 border border-amber-400 text-amber-700 px-4 py-2 rounded-md shadow-lg z-50 animate-pulse">
          Reconnexion en cours...
        </div>
      )}
      <div className="h-full w-full">
        <AdminDashboard />
      </div>
    </div>
  );
};

export default Admin;
