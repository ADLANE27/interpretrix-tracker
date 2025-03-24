
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import AdminDashboard from '@/components/admin/AdminDashboard';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useMissionUpdates } from '@/hooks/useMissionUpdates';

const Admin = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Add the useMissionUpdates hook with a more robust handler
  useMissionUpdates(() => {
    console.log('[Admin] Mission or interpreter update received, dispatching event');
    
    // Dispatch a custom event that the AdminDashboard will listen for
    window.dispatchEvent(new CustomEvent('interpreter-status-update'));
    
    // As a backup, trigger a manual refresh after a delay
    setTimeout(() => {
      console.log('[Admin] Executing delayed refresh');
      window.dispatchEvent(new CustomEvent('force-refresh-interpreters'));
    }, 3000);
  });

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

    // For better reliability, set up a periodic check for session validity
    const sessionCheckInterval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('Session expired, redirecting to login');
        navigate('/admin/login');
      }
    }, 300000); // Check every 5 minutes

    // Initial auth check
    checkAuth();

    // Setup connection recovery on network/visibility changes
    const handleConnectionRecovery = () => {
      if (document.visibilityState === 'visible' || navigator.onLine) {
        console.log('[Admin] Connection recovered, triggering refresh');
        window.dispatchEvent(new CustomEvent('interpreter-status-update'));
      }
    };

    window.addEventListener('online', handleConnectionRecovery);
    document.addEventListener('visibilitychange', handleConnectionRecovery);

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
      clearInterval(sessionCheckInterval);
      window.removeEventListener('online', handleConnectionRecovery);
      document.addEventListener('visibilitychange', handleConnectionRecovery);
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
