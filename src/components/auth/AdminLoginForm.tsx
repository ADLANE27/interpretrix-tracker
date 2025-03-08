
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export const AdminLoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    console.log("Tentative de connexion admin avec:", email);

    try {
      // First attempt to sign in
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        console.error("Erreur de connexion:", signInError);
        throw signInError;
      }

      if (!signInData.user) {
        throw new Error("Aucun utilisateur trouvé");
      }

      console.log("Connexion réussie, données utilisateur:", signInData.user);
      console.log("Vérification du rôle admin...");

      // Verify admin role using RLS and the is_admin() function
      const { data: isAdmin, error: roleError } = await supabase
        .rpc('is_admin');

      console.log("Résultat vérification rôle:", { isAdmin, roleError });

      if (roleError) {
        console.error("Erreur lors de la vérification du rôle:", roleError);
        throw new Error(`Erreur lors de la vérification du rôle: ${roleError.message}`);
      }

      if (!isAdmin) {
        console.error("L'utilisateur n'est pas administrateur");
        throw new Error("Vous n'avez pas les droits d'administrateur nécessaires.");
      }

      console.log("Rôle admin confirmé, redirection...");

      // If all checks pass, show success and navigate
      toast({
        title: "Connexion réussie",
        description: "Vous êtes maintenant connecté en tant qu'administrateur",
      });
      
      navigate("/admin");
    } catch (error: any) {
      console.error("Erreur complète:", error);
      await supabase.auth.signOut();
      toast({
        title: "Erreur de connexion",
        description: error.message,
        variant: "destructive",
      });
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
            className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#1A1F2C] focus:border-transparent transition-all duration-200"
            placeholder="admin@example.com"
            disabled={isLoading}
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
            className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#1A1F2C] focus:border-transparent transition-all duration-200"
            placeholder="••••••••"
            disabled={isLoading}
          />
        </div>
        <Button 
          type="submit" 
          className="w-full py-6 font-semibold text-white transition-all duration-200 bg-gradient-to-r from-[#1A1F2C] to-[#403E43] hover:from-[#2A2F3C] hover:to-[#504E53] rounded-lg shadow-md hover:shadow-lg"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <LoadingSpinner size="sm" className="mr-2" />
              <span>Connexion en cours...</span>
            </div>
          ) : (
            "Se connecter"
          )}
        </Button>
      </form>
    </Card>
  );
};
