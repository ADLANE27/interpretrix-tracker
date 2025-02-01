import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { subscribeToPushNotifications, unsubscribeFromPushNotifications } from '@/lib/pushNotifications';
import { Bell, BellOff } from 'lucide-react';

export const NotificationPermission = ({ interpreterId }: { interpreterId: string }) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribing, setIsSubscribing] = useState(false);
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
      setIsSubscribing(true);
      console.log('[Notifications] Attempting to enable notifications for interpreter:', interpreterId);
      
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
          toast({
            title: "Notifications bloquées",
            description: "Veuillez autoriser les notifications dans les paramètres de votre navigateur pour recevoir les alertes de missions",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erreur",
            description: "Impossible d'activer les notifications. Veuillez réessayer.",
            variant: "destructive",
          });
        }
      }
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleDisableNotifications = async () => {
    try {
      console.log('[Notifications] Disabling notifications for interpreter:', interpreterId);
      await unsubscribeFromPushNotifications(interpreterId);
      setPermission('default');
      
      toast({
        title: "Notifications désactivées",
        description: "Vous ne recevrez plus de notifications pour les nouvelles missions",
      });
    } catch (error) {
      console.error('[Notifications] Error disabling notifications:', error);
      toast({
        title: "Erreur",
        description: "Impossible de désactiver les notifications. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  };

  if (permission === 'granted') {
    return (
      <Button 
        variant="outline" 
        size="sm"
        onClick={handleDisableNotifications}
        className="flex items-center gap-2"
      >
        <BellOff className="h-4 w-4" />
        Désactiver les notifications
      </Button>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600">
        <Bell className="h-4 w-4" />
        <span>Notifications bloquées - Vérifiez les paramètres de votre navigateur</span>
      </div>
    );
  }

  return (
    <Button 
      onClick={handleEnableNotifications}
      variant="outline"
      size="sm"
      disabled={isSubscribing}
      className="flex items-center gap-2"
    >
      <Bell className="h-4 w-4" />
      {isSubscribing ? 'Activation...' : 'Activer les notifications'}
    </Button>
  );
};