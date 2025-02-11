
import { useEffect } from 'react';
import { generateAndStoreVapidKeys } from '@/lib/generateVapidKeys';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { ThemeToggle } from '@/components/interpreter/ThemeToggle';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const Admin = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const setupVapidKeys = async () => {
    try {
      const keys = await generateAndStoreVapidKeys();
      console.log('VAPID keys generated successfully:', keys);
      toast({
        title: "Succès",
        description: "Les clés VAPID ont été générées avec succès",
      });
    } catch (error) {
      console.error('Failed to generate VAPID keys:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer les clés VAPID",
        variant: "destructive",
      });
    }
  };

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

        setupVapidKeys();
      } catch (error) {
        console.error('Auth check error:', error);
        navigate('/admin/login');
      }
    };

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event);
      if (!session?.user || event === 'SIGNED_OUT') {
        navigate('/admin/login');
      }
    });

    checkAuth();

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Tableau de bord administrateur</h1>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button onClick={setupVapidKeys}>
              Regénérer les clés VAPID
            </Button>
          </div>
        </div>
        <AdminDashboard />
      </div>
    </div>
  );
};

export default Admin;
