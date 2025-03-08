
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role');

  useEffect(() => {
    // Check if we have a token hash in the URL (Supabase recovery flow)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type');
    const accessToken = hashParams.get('access_token');
    
    if (type === 'recovery' && accessToken) {
      // Set the session with the recovery token
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: '',
      });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Votre mot de passe a été mis à jour",
      });

      // Sign out the user after password reset
      await supabase.auth.signOut();

      // Redirect based on role
      navigate(role === 'admin' ? '/admin/login' : '/interpreter/login');
      
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la réinitialisation du mot de passe. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative">
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ 
          backgroundImage: "url('/lovable-uploads/c8a9b911-37a5-4f23-b3d2-c47b7436e522.png')",
        }}
      />
      
      <Card className="w-full max-w-md p-8 space-y-6 bg-white/95 backdrop-blur-sm shadow-2xl rounded-3xl border-0 relative z-10">
        <div className="space-y-2 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[#1A1F2C]">
            Réinitialisation du mot de passe
          </h2>
          <p className="text-sm text-[#8E9196]">
            Entrez votre nouveau mot de passe
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-[#403E43]">
              Nouveau mot de passe
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-[#403E43]">
              Confirmer le mot de passe
            </label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full"
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
                <span>Mise à jour...</span>
              </div>
            ) : (
              "Mettre à jour le mot de passe"
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default ResetPassword;
