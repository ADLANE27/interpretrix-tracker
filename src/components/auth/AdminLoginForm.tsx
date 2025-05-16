
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { motion } from "framer-motion";
import { Shield, Lock, User } from "lucide-react";

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

      // Use the access token to make a request to the is-admin edge function
      const { data, error } = await supabase.functions.invoke('is-admin', {
        method: 'GET'
      });

      console.log("Résultat vérification rôle via edge function:", { data, error });
      
      if (error) {
        console.error("Erreur lors de l'appel à la fonction is-admin:", error);
        throw new Error(`Erreur lors de la vérification du rôle: ${error.message}`);
      }

      if (!data.is_admin) {
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
    <Card className="w-full max-w-md shadow-2xl rounded-3xl border-0 relative overflow-hidden backdrop-blur-md bg-white/95 dark:bg-gray-900/90">
      {/* Subtle card header gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/10 to-transparent h-24 -z-10" />
      
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="p-8 space-y-6"
      >
        <div className="flex flex-col items-center space-y-3">
          <div className="p-3 bg-yellow-500/10 rounded-full">
            <Shield className="h-10 w-10 text-yellow-500" />
          </div>
          
          <h2 className="text-3xl font-bold tracking-tight text-[#1A1F2C] text-center dark:text-white">
            Espace administrateur
          </h2>
          <p className="text-sm text-[#8E9196] text-center max-w-xs">
            Connectez-vous à votre espace administrateur pour gérer la plateforme
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium flex items-center gap-2 text-[#403E43] dark:text-gray-300">
              <User className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              Email
            </label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2 border bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-gray-200 dark:border-gray-700 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                placeholder="admin@example.com"
                disabled={isLoading}
              />
              <User className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            </div>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium flex items-center gap-2 text-[#403E43] dark:text-gray-300">
              <Lock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              Mot de passe
            </label>
            <div className="relative">
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2 border bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-gray-200 dark:border-gray-700 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                placeholder="••••••••"
                disabled={isLoading}
              />
              <Lock className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            </div>
          </div>
          
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <Button 
              type="submit" 
              className="w-full py-6 font-semibold text-white transition-all duration-200 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 rounded-xl shadow-lg hover:shadow-xl shadow-yellow-500/20 hover:shadow-yellow-500/30 border border-yellow-400/20"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <LoadingSpinner size="sm" className="mr-2" />
                  <span>Connexion en cours...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Shield className="mr-2 h-5 w-5" />
                  <span>Se connecter</span>
                </div>
              )}
            </Button>
          </motion.div>
        </form>
      </motion.div>
    </Card>
  );
};
