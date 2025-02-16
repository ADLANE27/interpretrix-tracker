
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { waitForOneSignal } from "@/utils/notifications/initialization";

export const InterpreterLoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Memoize form handlers for better performance
  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  }, []);

  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loading) return; // Prevent double submission
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // After successful login, initialize OneSignal with a shorter timeout
      if (window.oneSignalInitPromise) {
        try {
          const initialized = await waitForOneSignal(5000); // Reduced timeout
          console.log('[OneSignal] Initialization after login:', initialized ? 'success' : 'failed');
        } catch (error) {
          console.error('[OneSignal] Login initialization error:', error);
          // Continue with login even if OneSignal fails
        }
      }

      toast({
        title: "Connexion réussie",
        description: "Bienvenue !",
        duration: 3000, // Shorter toast duration for better UX
      });

      // Pre-warm the dashboard route
      const dashboardUrl = "/";
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = dashboardUrl;
      document.head.appendChild(link);

      // Navigate to dashboard
      navigate(dashboardUrl);
    } catch (error: any) {
      toast({
        title: "Erreur de connexion",
        description: error.message || "Une erreur est survenue",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Connexion Interprète</h2>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={handleEmailChange}
            required
            className="w-full"
            autoComplete="email"
            spellCheck={false}
          />
        </div>
        <div>
          <Input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={handlePasswordChange}
            required
            className="w-full"
            autoComplete="current-password"
          />
        </div>
        <Button 
          type="submit" 
          className="w-full transition-all duration-200 hover:shadow-md" 
          disabled={loading}
        >
          {loading ? "Connexion..." : "Se connecter"}
        </Button>
      </form>
    </div>
  );
};
