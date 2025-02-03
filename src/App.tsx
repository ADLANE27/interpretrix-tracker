import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index";
import AdminLogin from "./pages/AdminLogin";
import InterpreterLogin from "./pages/InterpreterLogin";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkUser();
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        
        setUserRole(roles?.role || null);
      } else {
        setUserRole(null);
      }
    } catch (error) {
      console.error('Error checking user:', error);
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
                        className="px-6 py-3 bg-interpreter-navy text-white rounded-lg hover:bg-interpreter-navy/90 transition-colors"
                      >
                        Espace Administration
                      </a>
                      <a 
                        href="/interpreter/login" 
                        className="px-6 py-3 bg-interpreter-available text-white rounded-lg hover:bg-interpreter-available/90 transition-colors"
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