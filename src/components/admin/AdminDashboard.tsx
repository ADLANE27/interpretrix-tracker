import { useEffect } from 'react';
import { generateAndStoreVapidKeys } from '@/lib/generateVapidKeys';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";

const AdminDashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const setupVapidKeys = async () => {
    try {
      const keys = await generateAndStoreVapidKeys();
      console.log('VAPID keys generated successfully:', keys);
      toast({
        title: "Succès",
        description: "Les clés VAPID ont été générées avec succès",
      });
    } catch (error) {
      console.error('Failed to generate VAPID keys:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer les clés VAPID",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    setupVapidKeys();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Déconnexion réussie",
        description: "Vous avez été déconnecté avec succès",
      });
      navigate("/login");
    } catch (error) {
      console.error('Error logging out:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la déconnexion",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tableau de bord administrateur</h1>
        <Button 
          variant="outline"
          onClick={handleLogout}
          className="gap-2"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </Button>
      </div>
      <div className="mb-6">
        <Button onClick={setupVapidKeys} className="mb-4">
          Regénérer les clés VAPID
        </Button>
        <p className="text-sm text-gray-600">
          Cette action génère de nouvelles clés pour les notifications push.
        </p>
      </div>
    </div>
  );
};

export default AdminDashboard;