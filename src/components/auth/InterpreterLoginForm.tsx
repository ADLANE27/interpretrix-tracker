
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const InterpreterLoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  }, []);

  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loading) return;
    setLoading(true);

    try {
      console.log('Attempting login...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (!data.session) {
        throw new Error("No session created");
      }

      console.log('Login successful, attempting to set session...');

      // Let's first verify we have a valid session
      const currentSession = await supabase.auth.getSession();
      console.log('Current session:', currentSession);

      // Navigate only after confirming we have a valid session
      if (currentSession.data.session) {
        console.log('Session confirmed, navigating...');
        toast({
          title: "Connexion réussie",
          description: "Bienvenue !",
          duration: 3000,
        });

        // Navigate to dashboard
        navigate("/interpreter");
      } else {
        throw new Error("Failed to initialize session");
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setLoading(false); // Make sure to reset loading state on error
      toast({
        title: "Erreur de connexion",
        description: error.message || "Une erreur est survenue",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
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
