
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import AdminDashboard from '@/components/admin/AdminDashboard';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const Admin = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

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
    <div className="h-screen w-full bg-[#1a2844] transition-colors duration-300 overflow-hidden">
      <div className="h-full w-full">
        <AdminDashboard />
      </div>
    </div>
  );
};

export default Admin;
