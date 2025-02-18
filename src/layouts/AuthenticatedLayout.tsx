
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { InterpreterDashboard } from '@/components/InterpreterDashboard';
import { useToast } from '@/hooks/use-toast';

export const AuthenticatedLayout = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log('No active session, redirecting to interpreter login');
          navigate('/interpreter/login');
          return;
        }

        // Verify user role
        const { data: roles, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();

        if (rolesError || roles?.role !== 'interpreter') {
          console.error('User role verification failed:', rolesError);
          toast({
            title: "Accès non autorisé",
            description: "Vous n'avez pas les permissions nécessaires pour accéder à cette page",
            variant: "destructive",
          });
          navigate('/');
          return;
        }

        setLoading(false);
      } catch (error) {
        console.error('Auth check error:', error);
        toast({
          title: "Erreur d'authentification",
          description: "Une erreur est survenue lors de la vérification de vos permissions",
          variant: "destructive",
        });
        navigate('/interpreter/login');
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        navigate('/interpreter/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, toast]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
    </div>;
  }

  return <InterpreterDashboard />;
};
