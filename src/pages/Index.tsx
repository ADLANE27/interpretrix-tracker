
import { useEffect, useState } from "react";
import { InterpreterDashboard } from "@/components/InterpreterDashboard";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Globe2, Users, Clock, Languages } from "lucide-react";

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

        // Get user's roles from the user_roles table
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
          // Sign out user if we can't verify their role
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
      <div className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-[#1a2844] to-[#2a3854]">
        <main className="flex-1 px-4">
          <div className="max-w-6xl mx-auto pt-8 sm:pt-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">
                Bienvenue sur AFTraduction
              </h1>
              <p className="text-lg sm:text-xl text-gray-200 max-w-2xl mx-auto">
                Votre portail professionnel pour l'interprétation et la traduction de qualité
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 gap-8 max-w-4xl mx-auto px-4 mb-16">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex flex-col gap-6"
              >
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                  <Globe2 className="h-8 w-8 text-[#f5a51d] mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Services Professionnels</h3>
                  <p className="text-gray-200">Des services d'interprétation et de traduction de haute qualité</p>
                </div>
                <Link 
                  to="/interpreter/login" 
                  className="group relative overflow-hidden rounded-lg bg-gradient-to-r from-[#f5a51d] to-[#f6b53d] p-[2px] transition-all duration-300 hover:from-[#f6b53d] hover:to-[#f7c55d]"
                >
                  <div className="relative bg-[#1a2844] rounded-[6px] p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-semibold text-[#f5a51d] mb-2">Espace Interprète</h3>
                        <p className="text-gray-300">Accédez à votre espace de travail</p>
                      </div>
                      <Languages className="h-6 w-6 text-[#f5a51d] transition-transform group-hover:scale-110" />
                    </div>
                  </div>
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="flex flex-col gap-6"
              >
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                  <Clock className="h-8 w-8 text-white mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Disponibilité 24/7</h3>
                  <p className="text-gray-200">Une équipe d'interprètes disponible à tout moment</p>
                </div>
                <Link 
                  to="/admin/login" 
                  className="group relative overflow-hidden rounded-lg bg-gradient-to-r from-[#2a3854] to-[#3a4864] p-[2px] transition-all duration-300 hover:from-[#3a4864] hover:to-[#4a5874]"
                >
                  <div className="relative bg-[#1a2844] rounded-[6px] p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-2">Espace Administrateur</h3>
                        <p className="text-gray-300">Gérez votre équipe et vos services</p>
                      </div>
                      <Users className="h-6 w-6 text-white transition-transform group-hover:scale-110" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            </div>
          </div>
        </main>

        <footer className="text-center py-6 text-gray-400 text-sm backdrop-blur-sm bg-black/10">
          <p>© {new Date().getFullYear()} AFTraduction. Tous droits réservés.</p>
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
