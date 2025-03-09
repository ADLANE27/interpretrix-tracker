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

        const { data: role, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('active', true)
          .single();

        if (roleError) {
          console.error("Error fetching user role:", roleError);
          toast({
            title: "Erreur de vérification",
            description: "Impossible de vérifier vos permissions. Veuillez vous reconnecter.",
            variant: "destructive",
          });
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        setUserRole(role?.role || null);
      } catch (error) {
        console.error("Auth check error:", error);
        toast({
          title: "Erreur d'authentification",
          description: "Une erreur est survenue lors de la vérification de vos permissions",
          variant: "destructive",
        });
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
            className="flex flex-col items-center justify-start h-full pt-12 space-y-12 px-4"
          >
            <motion.img 
              src="/lovable-uploads/3737b103-faab-4bfc-a201-b1728b56f682.png" 
              alt="Interpretix Logo" 
              className="w-[500px] md:w-[600px] max-w-[90vw]"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5 }}
            />
            <div className="flex-1 flex flex-col items-center justify-center">
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
      ) : userRole === 'interpreter' ? (
        <InterpreterDashboard />
      ) : (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-4">Rôle non reconnu</h2>
            <p className="text-gray-600 mb-4">Votre compte n'a pas les permissions nécessaires.</p>
            <button
              onClick={() => supabase.auth.signOut()}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
