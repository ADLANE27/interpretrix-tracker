import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { ThemeToggle } from '@/components/interpreter/ThemeToggle';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
const Admin = () => {
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: {
            user
          }
        } = await supabase.auth.getUser();
        if (!user) {
          console.log('No user found, redirecting to login');
          navigate('/admin/login');
          return;
        }

        // Check if user has admin role
        const {
          data: roles
        } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
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
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
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
  return <div className="min-h-screen bg-background transition-colors duration-300">
      <div className="container mx-auto p-6 px-0 py-0">
        

        <AdminDashboard />
      </div>
    </div>;
};
export default Admin;