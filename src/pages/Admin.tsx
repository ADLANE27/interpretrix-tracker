
import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import AdminDashboard from '@/components/admin/AdminDashboard';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useMissionUpdates } from '@/hooks/useMissionUpdates';
import { Profile } from '@/types/profile';

const Admin = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());

  // Handler for general updates
  const handleGeneralUpdate = useCallback(() => {
    console.log('[Admin] General update triggered');
    // Use a custom event that multiple components can listen to
    window.dispatchEvent(new CustomEvent('interpreter-status-update'));
    setLastUpdateTime(Date.now());
  }, []);

  // Add the useMissionUpdates hook to refresh data when interpreter statuses change
  useMissionUpdates(handleGeneralUpdate);

  // Listen for specific interpreter updates
  useEffect(() => {
    const handleSpecificInterpreterUpdate = (event: Event) => {
      const { interpreterId, newStatus } = (event as CustomEvent).detail;
      console.log(`[Admin] Received specific update for interpreter ${interpreterId}: ${newStatus}`);
      
      // Dispatch a custom event with the specific interpreter ID and status
      window.dispatchEvent(
        new CustomEvent('specific-interpreter-update', {
          detail: { interpreterId, newStatus }
        })
      );
    };

    // Listen for both general and specific updates
    window.addEventListener('specific-interpreter-status-update', handleSpecificInterpreterUpdate);

    return () => {
      window.removeEventListener('specific-interpreter-status-update', handleSpecificInterpreterUpdate);
    };
  }, []);

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
        <AdminDashboard key={`admin-dashboard-${lastUpdateTime}`} />
      </div>
    </div>
  );
};

export default Admin;
