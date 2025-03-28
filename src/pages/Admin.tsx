
import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import AdminDashboard from '@/components/admin/AdminDashboard';
import { supabase } from '@/integrations/supabase/client';
import { useMissionUpdates } from '@/hooks/useMissionUpdates';
import { eventEmitter, EVENT_CONNECTION_STATUS_CHANGE } from '@/lib/events';
import { useConnectionMonitor } from '@/hooks/useConnectionMonitor';
import { ConnectionStatusNotification } from '@/components/admin/ConnectionStatusNotification';
import { realtimeService } from '@/services/realtimeService';

const Admin = () => {
  const navigate = useNavigate();
  const { 
    connectionError, 
    reconnectingFor, 
    isForceReconnecting, 
    handleForceReconnect 
  } = useConnectionMonitor();

  // Create a stable callback for mission updates to prevent re-renders
  const handleMissionUpdate = useCallback(() => {
    // Reset connection error state on successful updates
    if (connectionError) {
      eventEmitter.emit(EVENT_CONNECTION_STATUS_CHANGE, true);
    }
  }, [connectionError]);

  // Initialize realtime service once on admin page load
  useEffect(() => {
    console.log('[Admin] Initializing realtime service');
    const cleanup = realtimeService.init();
    return cleanup;
  }, []);

  // Add the useMissionUpdates hook with our stable callback
  useMissionUpdates(handleMissionUpdate);

  // Authentication check
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

  // Monitor page visibility to handle reconnection when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Admin] Page visibility changed to visible, checking connection');
        
        // Check connection and attempt reconnect if needed
        if (connectionError || !realtimeService.isConnected()) {
          realtimeService.reconnectAll();
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [connectionError]);

  return (
    <TooltipProvider>
      <div className="h-screen w-full bg-gradient-to-br from-[#1a2844] to-[#0f172a] transition-colors duration-300 overflow-hidden">
        <ConnectionStatusNotification 
          connectionError={connectionError}
          reconnectingFor={reconnectingFor}
          isForceReconnecting={isForceReconnecting}
          onForceReconnect={handleForceReconnect}
        />
        <div className="h-full w-full">
          <AdminDashboard />
        </div>
      </div>
    </TooltipProvider>
  );
};

export default Admin;
