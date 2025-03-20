
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

        // Log for debugging
        console.log('Admin authenticated, checking for unread mentions');

        // Mark unread mentions as read when admin enters the dashboard
        const { data: unreadMentions, error: fetchError } = await supabase
          .from('message_mentions')
          .select('id, status')
          .eq('mentioned_user_id', user.id)
          .eq('status', 'unread');
          
        if (fetchError) {
          console.error('Error fetching unread mentions:', fetchError);
        } else {
          console.log(`Found ${unreadMentions?.length || 0} unread mentions for admin:`, user.id);
          
          if (unreadMentions && unreadMentions.length > 0) {
            const { error: updateError } = await supabase
              .from('message_mentions')
              .update({ status: 'read' })
              .eq('mentioned_user_id', user.id)
              .eq('status', 'unread');
  
            if (updateError) {
              console.error('Error marking mentions as read:', updateError);
            } else {
              console.log(`Successfully marked ${unreadMentions.length} mentions as read`);
            }
          }
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
  }, [navigate, toast]);

  return (
    <div className="h-screen w-full bg-gradient-to-br from-[#1a2844] to-[#0f172a] transition-colors duration-300 overflow-hidden">
      <div className="h-full w-full">
        <AdminDashboard />
      </div>
    </div>
  );
};

export default Admin;
