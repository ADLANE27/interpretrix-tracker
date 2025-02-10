
import { useEffect, useState } from "react";
import { InterpreterDashboard } from "@/components/InterpreterDashboard";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const Index = () => {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        // Get the initial session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.log("[Index] No active session found");
          setLoading(false);
          return;
        }

        // If we have a session, get the user role
        const { data: roles, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();
        
        if (rolesError) {
          console.error("[Index] Error fetching user role:", rolesError);
          toast({
            title: "Erreur",
            description: "Impossible de vérifier vos permissions",
            variant: "destructive",
          });
          return;
        }

        setUserRole(roles?.role || null);
      } catch (error) {
        console.error("[Index] Auth check error:", error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[Index] Auth state changed:", event, session?.user?.id);
      
      if (!session) {
        console.log("[Index] No session in auth change");
        setUserRole(null);
        setLoading(false);
        return;
      }

      try {
        const { data: roles, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();

        if (rolesError) {
          console.error("[Index] Error fetching user role on auth change:", rolesError);
          return;
        }

        setUserRole(roles?.role || null);
      } catch (error) {
        console.error("[Index] Error in auth change handler:", error);
      } finally {
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
            className="flex flex-col items-center justify-center space-y-8 px-4"
          >
            <h1 className="text-3xl font-bold">Bienvenue</h1>
            <div className="flex flex-col sm:flex-row gap-4">
              <a 
                href="/admin/login" 
                className="px-6 py-3 bg-gradient-to-r from-[#1a2844] to-[#2a3854] text-white rounded-lg hover:from-[#2a3854] hover:to-[#3a4864] transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Espace Administrateur
              </a>
              <a 
                href="/interpreter/login" 
                className="px-6 py-3 bg-gradient-to-r from-[#f5a51d] to-[#f6b53d] text-white rounded-lg hover:from-[#f6b53d] hover:to-[#f7c55d] transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Espace Interprète
              </a>
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
