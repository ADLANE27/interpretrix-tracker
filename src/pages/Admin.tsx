import { useEffect } from 'react';
import { generateAndStoreVapidKeys } from '@/lib/generateVapidKeys';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { AdminHowToUseGuide } from '@/components/admin/AdminHowToUseGuide';

const Admin = () => {
  const { toast } = useToast();

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

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tableau de bord administrateur</h1>
        <AdminHowToUseGuide />
      </div>
      <div className="mb-6">
        <Button onClick={setupVapidKeys} className="mb-4">
          Regénérer les clés VAPID
        </Button>
        <p className="text-sm text-gray-600">
          Cette action génère de nouvelles clés pour les notifications push.
        </p>
      </div>
      <AdminDashboard />
    </div>
  );
};

export default Admin;