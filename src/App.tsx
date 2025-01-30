import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Index from "./pages/Index";
import AdminLogin from "./pages/AdminLogin";
import InterpreterLogin from "./pages/InterpreterLogin";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        setUserRole(null);
        queryClient.clear();
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await checkUser();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        throw userError;
      }

      if (user) {
        const { data: roles, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        
        if (rolesError) {
          throw rolesError;
        }
        
        setUserRole(roles?.role || null);
      } else {
        setUserRole(null);
      }
    } catch (error: any) {
      console.error('Error checking user:', error);
      toast({
        title: "Erreur d'authentification",
        description: "Veuillez vous reconnecter",
        variant: "destructive",
      });
      await supabase.auth.signOut();
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route 
              path="/" 
              element={
                !userRole ? (
                  <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4 space-y-8">
                    <h1 className="text-3xl font-bold text-gray-800">Bienvenue</h1>
                    <div className="flex gap-4">
                      <a 
                        href="/admin/login" 
                        className="px-6 py-3 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors"
                      >
                        Espace Administration
                      </a>
                      <a 
                        href="/interpreter/login" 
                        className="px-6 py-3 bg-green-800 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Espace Interprète
                      </a>
                    </div>
                  </div>
                ) : userRole === 'admin' ? (
                  <Navigate to="/admin" replace />
                ) : (
                  <Navigate to="/interpreter" replace />
                )
              } 
            />
            <Route 
              path="/admin/login" 
              element={
                userRole === 'admin' ? (
                  <Navigate to="/admin" replace />
                ) : (
                  <AdminLogin />
                )
              } 
            />
            <Route 
              path="/interpreter/login" 
              element={
                userRole === 'interpreter' ? (
                  <Navigate to="/interpreter" replace />
                ) : (
                  <InterpreterLogin />
                )
              } 
            />
            <Route 
              path="/admin" 
              element={
                !userRole ? (
                  <Navigate to="/admin/login" replace />
                ) : userRole === 'admin' ? (
                  <Index />
                ) : (
                  <Navigate to="/interpreter/login" replace />
                )
              } 
            />
            <Route 
              path="/interpreter" 
              element={
                !userRole ? (
                  <Navigate to="/interpreter/login" replace />
                ) : userRole === 'interpreter' ? (
                  <Index />
                ) : (
                  <Navigate to="/admin/login" replace />
                )
              } 
            />
            <Route 
              path="/profile" 
              element={
                userRole ? (
                  <Profile />
                ) : (
                  <Navigate to="/" replace />
                )
              } 
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;