
import { useEffect, useState } from "react";
import { InterpreterDashboard } from "@/components/InterpreterDashboard";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.log("No active user found, redirecting to login");
          setLoading(false);
          return;
        }

        const { data: roles, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        
        if (rolesError) {
          console.error("Error fetching user role:", rolesError);
          toast({
            title: "Erreur",
            description: "Impossible de vérifier vos permissions",
            variant: "destructive",
          });
          return;
        }

        setUserRole(roles?.role || null);
      } catch (error) {
        console.error("Auth check error:", error);
        toast({
          title: "Erreur d'authentification",
          description: "Veuillez vous reconnecter",
          variant: "destructive",
        });
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        console.log("Auth state changed: no session");
        setUserRole(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
      </div>
    );
  }

  if (!userRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4">
          <div className="space-x-4">
            <a 
              href="/admin/login" 
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Espace Administrateur
            </a>
            <a 
              href="/interpreter/login" 
              className="inline-block px-6 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
            >
              Espace Interprète
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {userRole === 'admin' ? (
        <AdminDashboard />
      ) : (
        <InterpreterDashboard />
      )}
    </div>
  );
};

export default Index;
