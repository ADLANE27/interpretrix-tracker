
import { useEffect, useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import AdminDashboard from '@/components/admin/AdminDashboard';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useMissionUpdates } from '@/hooks/useMissionUpdates';
import { eventEmitter, EVENT_CONNECTION_STATUS_CHANGE } from '@/lib/events';
import { realtimeService } from '@/services/realtimeService';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, WifiOff } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';

const Admin = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [connectionError, setConnectionError] = useState(false);
  const [reconnectingFor, setReconnectingFor] = useState(0);
  const [isForceReconnecting, setIsForceReconnecting] = useState(false);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectStartTimeRef = useRef<number | null>(null);
  const connectionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSuccessfulConnectionRef = useRef<number>(Date.now());
  const reconnectTimerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize realtime service and listen for connection status changes
  useEffect(() => {
    const cleanup = realtimeService.init();
    
    const handleConnectionStatusChange = (connected: boolean) => {
      console.log('[Admin] Connection status changed:', connected);
      
      if (connected) {
        // Connection is back, reset error state
        if (connectionError) {
          setConnectionError(false);
          setIsForceReconnecting(false);
          toast({
            title: "Connexion rétablie",
            description: "La connexion temps réel a été rétablie",
          });
        }
        reconnectAttemptRef.current = 0;
        reconnectStartTimeRef.current = null;
        setReconnectingFor(0);
        
        if (reconnectTimerIntervalRef.current) {
          clearInterval(reconnectTimerIntervalRef.current);
          reconnectTimerIntervalRef.current = null;
        }
        
        lastSuccessfulConnectionRef.current = Date.now();
      } else {
        // Connection lost, start tracking time
        if (!reconnectStartTimeRef.current) {
          reconnectStartTimeRef.current = Date.now();
          
          // Start a timer to track how long we've been reconnecting
          if (reconnectTimerIntervalRef.current) {
            clearInterval(reconnectTimerIntervalRef.current);
          }
          
          reconnectTimerIntervalRef.current = setInterval(() => {
            if (reconnectStartTimeRef.current) {
              const elapsedSeconds = Math.floor((Date.now() - reconnectStartTimeRef.current) / 1000);
              setReconnectingFor(elapsedSeconds);
            }
          }, 1000);
        }
        
        setConnectionError(true);
        reconnectAttemptRef.current += 1;
      }
    };
    
    eventEmitter.on(EVENT_CONNECTION_STATUS_CHANGE, handleConnectionStatusChange);
    
    // Initial connection check
    setTimeout(() => {
      const isConnected = realtimeService.isConnected();
      handleConnectionStatusChange(isConnected);
    }, 3000);
    
    return () => {
      eventEmitter.off(EVENT_CONNECTION_STATUS_CHANGE, handleConnectionStatusChange);
      cleanup();
      
      if (reconnectTimerIntervalRef.current) {
        clearInterval(reconnectTimerIntervalRef.current);
      }
    };
  }, [toast, connectionError]);

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

  // Manual force reconnect handler
  const handleForceReconnect = () => {
    console.log('[Admin] Manual reconnection requested');
    setIsForceReconnecting(true);
    
    // Reset timers for tracking reconnection time
    if (reconnectStartTimeRef.current) {
      reconnectStartTimeRef.current = Date.now();
      setReconnectingFor(0);
    }
    
    // Attempt full service reconnection
    realtimeService.reconnectAll();
    
    toast({
      title: "Reconnexion initiée",
      description: "Tentative de reconnexion en cours...",
    });
    
    // Reset force reconnecting state after a timeout
    setTimeout(() => {
      setIsForceReconnecting(false);
    }, 8000);
  };

  return (
    <TooltipProvider>
      <div className="h-screen w-full bg-gradient-to-br from-[#1a2844] to-[#0f172a] transition-colors duration-300 overflow-hidden">
        {connectionError && (
          <div className="fixed top-4 right-4 bg-amber-100 border border-amber-400 text-amber-700 px-4 py-3 rounded-md shadow-lg z-50 flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {isForceReconnecting ? (
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                ) : (
                  <WifiOff className="h-4 w-4 mr-2" />
                )}
                <span className="font-medium">Reconnexion en cours...</span>
              </div>
              <span className="text-xs ml-2 bg-amber-200 px-1.5 py-0.5 rounded-full">{reconnectingFor}s</span>
            </div>
            {reconnectingFor > 10 && !isForceReconnecting && (
              <Button 
                variant="outline"
                size="sm"
                onClick={handleForceReconnect}
                className="mt-2 text-xs bg-amber-200 hover:bg-amber-300 text-amber-800 border-amber-300"
                disabled={isForceReconnecting}
              >
                {isForceReconnecting ? (
                  <>
                    <Loader2 className="animate-spin h-3 w-3 mr-1" />
                    Reconnexion...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Forcer la reconnexion
                  </>
                )}
              </Button>
            )}
          </div>
        )}
        <div className="h-full w-full">
          <AdminDashboard />
        </div>
      </div>
    </TooltipProvider>
  );
};

export default Admin;
