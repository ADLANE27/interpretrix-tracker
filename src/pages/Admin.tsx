
import { useEffect, useState } from 'react';
import { generateAndStoreVapidKeys } from '@/lib/generateVapidKeys';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { ThemeToggle } from '@/components/interpreter/ThemeToggle';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";

const Admin = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [vapidStatus, setVapidStatus] = useState<{
    isValid: boolean;
    errorMessage?: string;
  } | null>(null);

  const checkVapidKeys = async () => {
    try {
      const { data, error } = await supabase
        .rpc('validate_vapid_keys');

      if (error) throw error;

      if (data && data.length > 0) {
        const status = data[0];
        setVapidStatus({
          isValid: status.is_valid,
          errorMessage: status.error_message
        });

        if (!status.is_valid) {
          console.error('[VAPID] Validation failed:', status.error_message);
        }
      }
    } catch (error) {
      console.error('[VAPID] Check failed:', error);
      setVapidStatus({
        isValid: false,
        errorMessage: 'Failed to check VAPID keys status'
      });
    }
  };

  const setupVapidKeys = async () => {
    try {
      const keys = await generateAndStoreVapidKeys();
      console.log('[VAPID] Keys generated successfully:', keys);
      toast({
        title: "Succès",
        description: "Les clés VAPID ont été générées avec succès",
      });
      // Recheck status after generation
      await checkVapidKeys();
    } catch (error) {
      console.error('[VAPID] Failed to generate keys:', error);
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

    // Initial auth check and VAPID setup
    checkAuth();
    checkVapidKeys();

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

        {vapidStatus && (
          <Alert className={`mb-6 ${vapidStatus.isValid ? 'bg-green-50' : 'bg-red-50'}`}>
            {vapidStatus.isValid ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertTitle>
              {vapidStatus.isValid ? 'Clés VAPID valides' : 'Problème avec les clés VAPID'}
            </AlertTitle>
            <AlertDescription>
              {vapidStatus.isValid 
                ? 'Les notifications push peuvent être utilisées.'
                : vapidStatus.errorMessage || 'Les clés VAPID ne sont pas valides.'}
            </AlertDescription>
          </Alert>
        )}

        <AdminDashboard />
      </div>
    </div>
  );
};

export default Admin;
