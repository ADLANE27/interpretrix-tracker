
import { useEffect, useState } from "react";
import { InterpreterDashboard } from "@/components/InterpreterDashboard";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

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
          console.log("No active user found, showing role selection");
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
          setLoading(false);
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
        setLoading(false);
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
      <div className="min-h-screen flex flex-col justify-between">
        <div className="flex items-center justify-center flex-1">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center space-y-4 px-4"
          >
            <h1 className="text-3xl font-bold mb-8">Bienvenue</h1>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                to="/admin/login" 
                className="px-6 py-3 bg-gradient-to-r from-[#1a2844] to-[#2a3854] text-white rounded-lg hover:from-[#2a3854] hover:to-[#3a4864] transition-all duration-200 shadow-md hover:shadow-lg text-center"
              >
                Espace Administrateur
              </Link>
              <Link 
                to="/interpreter/login" 
                className="px-6 py-3 bg-gradient-to-r from-[#f5a51d] to-[#f6b53d] text-white rounded-lg hover:from-[#f6b53d] hover:to-[#f7c55d] transition-all duration-200 shadow-md hover:shadow-lg text-center"
              >
                Espace Interprète
              </Link>
            </div>
          </motion.div>
        </div>
        <footer className="text-center py-4 text-gray-600 text-sm">
          © {new Date().getFullYear()} AFTraduction. Tous droits réservés.
        </footer>
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
