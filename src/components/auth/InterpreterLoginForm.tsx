import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const InterpreterLoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      // Update the password_changed flag in interpreter_profiles
      const { error: profileError } = await supabase
        .from('interpreter_profiles')
        .update({ password_changed: true })
        .eq('id', (await supabase.auth.getUser()).data.user?.id);

      if (profileError) throw profileError;

      toast({
        title: "Mot de passe mis à jour",
        description: "Votre nouveau mot de passe a été enregistré",
      });

      setShowChangePassword(false);
      navigate("/interpreter");
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (authError) {
        if (authError.message.includes("Invalid login credentials")) {
          throw new Error("Email ou mot de passe incorrect");
        }
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error("Aucune donnée utilisateur retournée");
      }

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authData.user.id)
        .single();

      if (rolesError) {
        throw new Error("Erreur lors de la vérification du rôle");
      }

      if (roles?.role !== 'interpreter') {
        await supabase.auth.signOut();
        throw new Error("Accès non autorisé. Cette interface est réservée aux interprètes.");
      }

      // Check if this is first login (password hasn't been changed)
      const { data: metadata, error: metadataError } = await supabase
        .from('interpreter_profiles')
        .select('password_changed')
        .eq('id', authData.user.id)
        .single();

      if (!metadataError && metadata && !metadata.password_changed) {
        setShowChangePassword(true);
        return;
      }

      toast({
        title: "Connexion réussie",
        description: "Vous êtes maintenant connecté en tant qu'interprète",
      });
      
      navigate("/interpreter");
    } catch (error: any) {
      toast({
        title: "Erreur de connexion",
        description: error.message || "Une erreur est survenue lors de la connexion",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card className="w-full max-w-md p-8 space-y-6 bg-white shadow-lg rounded-xl border-0">
        <div className="space-y-2 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[#403E43]">Espace Interprète</h2>
          <p className="text-sm text-[#8E9196]">Connectez-vous à votre espace personnel</p>
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
              className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#9b87f5] focus:border-transparent transition-all duration-200"
              disabled={isLoading}
              placeholder="interpreter@example.com"
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
              className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#9b87f5] focus:border-transparent transition-all duration-200"
              disabled={isLoading}
              placeholder="••••••••"
            />
          </div>
          <Button 
            type="submit" 
            className="w-full py-3 font-semibold text-white transition-all duration-200 bg-gradient-to-r from-[#9b87f5] to-[#7E69AB] hover:from-[#8B76E3] hover:to-[#6D5999] rounded-lg shadow-md hover:shadow-lg disabled:opacity-70"
            disabled={isLoading}
          >
            {isLoading ? "Connexion en cours..." : "Se connecter"}
          </Button>
        </form>
      </Card>

      <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changement de mot de passe requis</DialogTitle>
            <DialogDescription>
              Pour des raisons de sécurité, vous devez changer votre mot de passe temporaire.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="newPassword" className="text-sm font-medium">
                Nouveau mot de passe
              </label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nouveau mot de passe"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirmer le mot de passe
              </label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmer le mot de passe"
              />
            </div>
            <Button 
              onClick={handlePasswordChange}
              className="w-full"
            >
              Changer le mot de passe
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};