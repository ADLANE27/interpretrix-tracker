import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Globe2 } from "lucide-react";

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
    <Card className="w-full max-w-md p-8 space-y-6 bg-white/95 backdrop-blur-sm shadow-2xl rounded-3xl border-0 relative z-10">
      <div className="space-y-2 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-[#1A1F2C]">
          Espace administrateur
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
            className="w-full px-4 py-2 border border-[#E5E7EB] rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all duration-200"
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
            className="w-full px-4 py-2 border border-[#E5E7EB] rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all duration-200"
            placeholder="••••••••"
            disabled={isLoading}
          />
        </div>
        <Button 
          type="submit" 
          className="w-full py-6 font-semibold text-white transition-all duration-200 bg-[#1A1F2C] hover:bg-[#2A2F3C] rounded-xl shadow-md hover:shadow-lg"
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
