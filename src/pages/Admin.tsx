
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import AdminDashboard from '@/components/admin/AdminDashboard';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useMissionUpdates } from '@/hooks/useMissionUpdates';

const Admin = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [connectionError, setConnectionError] = useState(false);

  // Add the useMissionUpdates hook to refresh data when interpreter statuses change
  useMissionUpdates(() => {
    // Reset connection error state on successful updates
    if (connectionError) setConnectionError(false);
    // Dispatch a custom event that the AdminDashboard will listen for
    window.dispatchEvent(new CustomEvent('interpreter-status-update'));
  });

  // Handle connection status
  useEffect(() => {
    const connectionCheck = setInterval(() => {
      // If there are no active channels, it might indicate a connection issue
      const channels = supabase.getChannels();
      const connected = channels.length > 0 && channels.some(c => c.state === 'SUBSCRIBED');
      
      if (!connected && !connectionError) {
        console.log('Connection issue detected, will attempt to reconnect');
        setConnectionError(true);
      } else if (connected && connectionError) {
        setConnectionError(false);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(connectionCheck);
  }, [connectionError]);

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
      {connectionError && (
        <div className="fixed top-4 right-4 bg-amber-100 border border-amber-400 text-amber-700 px-4 py-2 rounded-md shadow-lg z-50">
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
