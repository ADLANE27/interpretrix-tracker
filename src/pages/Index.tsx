
import { useEffect, useState } from "react";
import { InterpreterDashboard } from "@/components/InterpreterDashboard";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { WelcomeText } from "@/components/landing/WelcomeText";
import { FloatingLanguages } from "@/components/landing/FloatingLanguages";
import { Globe, MessageSquare, Headphones } from "lucide-react";

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-blue-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!userRole) {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-white to-blue-50">
        <div className="flex items-center justify-center flex-1 relative">
          <FloatingLanguages />
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center space-y-8 px-4 z-10"
          >
            <WelcomeText />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 max-w-4xl mx-auto">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center justify-center"
              >
                <Globe className="w-8 h-8 text-primary mr-2" />
                <p className="text-gray-600">Communication globale</p>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center justify-center"
              >
                <MessageSquare className="w-8 h-8 text-primary mr-2" />
                <p className="text-gray-600">Traduction professionnelle</p>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center justify-center"
              >
                <Headphones className="w-8 h-8 text-primary mr-2" />
                <p className="text-gray-600">Interprétation en direct</p>
              </motion.div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <Link 
                to="/admin/login" 
                className="relative group px-6 py-3 rounded-lg overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#1a2844] to-[#2a3854] group-hover:from-[#2a3854] group-hover:to-[#3a4864] transition-all duration-200"></div>
                <span className="relative text-white font-medium">
                  Espace Administrateur
                </span>
              </Link>
              <Link 
                to="/interpreter/login" 
                className="relative group px-6 py-3 rounded-lg overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#f5a51d] to-[#f6b53d] group-hover:from-[#f6b53d] group-hover:to-[#f7c55d] transition-all duration-200"></div>
                <span className="relative text-white font-medium">
                  Espace Interprète
                </span>
              </Link>
            </div>
          </motion.div>
        </div>
        
        <footer className="text-center py-6 bg-white/50 backdrop-blur-sm border-t border-gray-100">
          <p className="text-gray-600 text-sm">
            © {new Date().getFullYear()} AFTraduction. Tous droits réservés.
          </p>
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
