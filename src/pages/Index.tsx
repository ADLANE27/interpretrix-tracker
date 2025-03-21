
import { useEffect, useState } from "react";
import { InterpreterDashboard } from "@/components/InterpreterDashboard";
import AdminDashboard from "@/components/admin/AdminDashboard";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { WelcomeContent } from "@/components/WelcomeContent";
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
      <div className="min-h-screen w-full bg-white dark:bg-gray-900 overflow-y-auto">
        <div className="relative z-10 min-h-screen flex flex-col">
          <motion.header 
            className="py-6 px-8 flex items-center justify-between"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="text-xl font-bold"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <img 
                src="/lovable-uploads/6e8ba30f-137d-474a-9c54-fd5f712b2b41.png" 
                alt="Logo" 
                className="h-10 w-auto" 
              />
            </motion.div>
          </motion.header>
          
          <div className="flex-1 flex items-center justify-center gradient-bg-subtle">
            <WelcomeContent />
          </div>
          
          <motion.footer 
            className="text-center py-6 text-slate-600 dark:text-slate-400 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.5 }}
          >
            <div className="max-w-6xl mx-auto px-4">
              <p>© {new Date().getFullYear()} Interprétation professionnelle. Tous droits réservés.</p>
            </div>
          </motion.footer>
        </div>
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
