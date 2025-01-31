import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { subscribeToPushNotifications } from '@/lib/pushNotifications';
import { Bell, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';

export const NotificationPermission = ({ interpreterId }: { interpreterId: string }) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const { toast } = useToast();

  useEffect(() => {
    if ('Notification' in window) {
      console.log('[Notifications] Current permission status:', Notification.permission);
      setPermission(Notification.permission);
    } else {
      console.warn('[Notifications] Notifications not supported in this browser');
    }
  }, []);

  const handleEnableNotifications = async () => {
    try {
      console.log('[Notifications] Attempting to enable notifications for interpreter:', interpreterId);
      
      if (!('Notification' in window)) {
        toast({
          title: "Erreur",
          description: "Votre navigateur ne supporte pas les notifications",
          variant: "destructive",
        });
        return;
      }

      await subscribeToPushNotifications(interpreterId);
      setPermission('granted');
      console.log('[Notifications] Successfully enabled notifications');
      toast({
        title: "Notifications activées",
        description: "Vous recevrez des notifications pour les nouvelles missions",
      });
    } catch (error) {
      console.error('[Notifications] Error enabling notifications:', error);
      
      if (error instanceof Error) {
        if (error.message === 'Notification permission denied') {
          setPermission('denied');
        } else {
          toast({
            title: "Erreur",
            description: "Impossible d'activer les notifications. Veuillez réessayer.",
            variant: "destructive",
          });
        }
      }
    }
  };

  if (permission === 'denied') {
    return (
      <Card className="bg-red-500 text-white p-4 max-w-md">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-semibold">Notifications bloquées</h4>
            <p className="text-sm">
              Veuillez autoriser les notifications dans les paramètres de votre navigateur 
              pour recevoir les alertes de missions
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (permission === 'granted') {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <Bell className="h-4 w-4" />
        <span>Notifications activées</span>
      </div>
    );
  }

  return (
    <Button 
      onClick={handleEnableNotifications}
      variant="outline"
      className="flex items-center gap-2"
    >
      <Bell className="h-4 w-4" />
      Activer les notifications
    </Button>
  );
};