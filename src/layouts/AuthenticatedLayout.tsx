
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { InterpreterDashboard } from '@/components/InterpreterDashboard';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

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
        // Ignore DataCloneError from postMessage operations
        if (!(error instanceof DOMException && error.name === 'DataCloneError')) {
          toast({
            title: "Erreur d'authentification",
            description: "Une erreur est survenue lors de la vérification de vos permissions",
            variant: "destructive",
          });
          navigate('/interpreter/login');
        }
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        navigate('/interpreter/login');
      }
    });

    // Clean up function to handle any remaining subscriptions
    return () => {
      try {
        subscription.unsubscribe();
      } catch (error) {
        // Ignore DataCloneError from postMessage operations
        if (!(error instanceof DOMException && error.name === 'DataCloneError')) {
          console.error('Error during cleanup:', error);
        }
      }
    };
  }, [navigate, toast]);

  // Add error boundary to handle any uncaught errors
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
          <p className="text-destructive">Une erreur est survenue lors du chargement du tableau de bord</p>
          <Button onClick={() => window.location.reload()}>Recharger la page</Button>
        </div>
      }
    >
      <InterpreterDashboard />
    </ErrorBoundary>
  );
};

// Simple ErrorBoundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // Ignore DataCloneError from postMessage operations
    if (!(error instanceof DOMException && error.name === 'DataCloneError')) {
      console.error('Error caught by boundary:', error);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
