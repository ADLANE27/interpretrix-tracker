
import { useEffect, useState } from 'react';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const Admin = () => {
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        // Get current session
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.log('No user found, redirecting to login');
          if (mounted) {
            navigate('/admin/login');
          }
          return;
        }

        // Verify admin status
        const { data: isAdmin, error: adminCheckError } = await supabase.rpc('is_admin', {
          user_id: user.id
        });

        if (adminCheckError || !isAdmin) {
          console.log('User is not an admin or error occurred, redirecting to login');
          await supabase.auth.signOut();
          if (mounted) {
            navigate('/admin/login');
          }
          return;
        }

        if (mounted) {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        if (mounted) {
          navigate('/admin/login');
        }
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        if (mounted) {
          navigate('/admin/login');
        }
      } else if (session) {
        // Recheck admin status on auth state change
        checkAuth();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background transition-colors duration-300">
      <div className="h-full container mx-auto p-6 px-0 py-0">
        <AdminDashboard />
      </div>
    </div>
  );
};

export default Admin;
