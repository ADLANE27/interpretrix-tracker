
import { useEffect, useState, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import AdminDashboard from '@/components/admin/AdminDashboard';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useMissionUpdates } from '@/hooks/useMissionUpdates';

const Admin = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isPolling, setIsPolling] = useState(true);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalMs = 10000; // Polling interval reduced to 10 seconds
  const lastPollTimeRef = useRef<number>(0);
  const pendingPollingRef = useRef<boolean>(false);
  
  // Use this function to refresh interpreter status data
  const refreshInterpreterStatuses = useCallback(() => {
    const now = Date.now();
    
    // If we recently refreshed or if there's a pending refresh operation, skip this update
    if (now - lastPollTimeRef.current < 2000 || pendingPollingRef.current) {
      console.log('[Admin] Skipping refresh - too soon or pending refresh');
      return;
    }
    
    console.log('[Admin] Refreshing interpreter statuses');
    lastPollTimeRef.current = now;
    pendingPollingRef.current = true;
    
    // Dispatch a custom event that the AdminDashboard components will listen for
    window.dispatchEvent(new CustomEvent('interpreter-status-update'));
    
    // Clear the pending flag after a short delay to allow the UI to update
    setTimeout(() => {
      pendingPollingRef.current = false;
    }, 1000);
  }, []);

  // Set up polling for interpreter status updates
  useEffect(() => {
    const setupPolling = () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      
      if (isPolling) {
        console.log('[Admin] Starting interpreter status polling');
        // Initial refresh immediately after page load
        refreshInterpreterStatuses();
        
        pollingIntervalRef.current = setInterval(() => {
          if (document.visibilityState === 'visible') {
            console.log('[Admin] Polling interpreter statuses');
            refreshInterpreterStatuses();
          } else {
            console.log('[Admin] Page not visible, skipping poll');
          }
        }, pollingIntervalMs);
      }
    };
    
    setupPolling();
    
    // Clean up interval on unmount
    return () => {
      console.log('[Admin] Cleaning up polling interval');
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [isPolling, refreshInterpreterStatuses]);

  // Use the modified useMissionUpdates hook as a supplementary method to refresh data
  useMissionUpdates(refreshInterpreterStatuses);

  // Handle visible/hidden state
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Admin] Page became visible, immediately refreshing statuses');
        refreshInterpreterStatuses();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refreshInterpreterStatuses]);

  // Handle online/offline state
  useEffect(() => {
    const handleOnline = () => {
      console.log('[Admin] Network connection restored, immediately refreshing statuses');
      refreshInterpreterStatuses();
    };
    
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [refreshInterpreterStatuses]);

  // Authentication check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('No user found, redirecting to login');
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
          console.log('User is not an admin, redirecting to login');
          await supabase.auth.signOut();
          navigate('/admin/login');
          return;
        }
      } catch (error) {
        console.error('Auth check error:', error);
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
      <div className="h-full w-full">
        <AdminDashboard />
      </div>
    </div>
  );
};

export default Admin;
