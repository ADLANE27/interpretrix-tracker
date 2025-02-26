
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export const AdminLoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // First attempt login
      const { data: authData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (loginError) throw loginError;

      if (!authData.user) {
        throw new Error("No user data returned after login");
      }

      // Check if user is admin using RPC function
      const { data: isAdmin, error: adminCheckError } = await supabase.rpc('is_admin', {
        user_id: authData.user.id
      });

      if (adminCheckError) throw adminCheckError;

      if (!isAdmin) {
        // If not admin, sign out and show error
        await supabase.auth.signOut();
        throw new Error("Accès non autorisé. Cette interface est réservée aux administrateurs.");
      }

      toast({
        title: "Connexion réussie",
        description: "Vous êtes maintenant connecté en tant qu'administrateur",
      });
      
      navigate("/admin");
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Erreur de connexion",
        description: error.message,
        variant: "destructive",
      });
      
      // Ensure we're signed out if there was an error
      await supabase.auth.signOut();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md p-8 space-y-6 bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl border-0">
      <div className="space-y-2 text-center">
        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-[#1A1F2C] to-[#403E43] bg-clip-text text-transparent">
          Administration
        </h2>
        <p className="text-sm text-[#8E9196]">
          Connectez-vous à votre espace administrateur
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-[#403E43]">
            Email
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#1A1F2C] focus:border-transparent transition-all duration-200"
            placeholder="admin@example.com"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-[#403E43]">
            Mot de passe
          </label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#1A1F2C] focus:border-transparent transition-all duration-200"
            placeholder="••••••••"
          />
        </div>
        <Button 
          type="submit" 
          disabled={isLoading}
          className="w-full py-6 font-semibold text-white transition-all duration-200 bg-gradient-to-r from-[#1A1F2C] to-[#403E43] hover:from-[#2A2F3C] hover:to-[#504E53] rounded-lg shadow-md hover:shadow-lg"
        >
          {isLoading ? "Connexion..." : "Se connecter"}
        </Button>
      </form>
    </Card>
  );
};
