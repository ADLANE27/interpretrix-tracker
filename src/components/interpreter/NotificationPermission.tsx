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
    checkNotificationPermission();
  }, []);

  const checkNotificationPermission = () => {
    if (!('Notification' in window)) {
      console.warn('[Notifications] Notifications not supported');
      return;
    }

    console.log('[Notifications] Current permission:', Notification.permission);
    setPermission(Notification.permission);
  };

  const handleEnableNotifications = async () => {
    try {
      setIsSubscribing(true);
      console.log('[Notifications] Requesting permission...');

      // First request notification permission
      const permission = await Notification.requestPermission();
      console.log('[Notifications] Permission result:', permission);

      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }

      // Then register service worker and subscribe to push
      await subscribeToPushNotifications(interpreterId);
      setPermission('granted');
      
      toast({
        title: "Notifications activées",
        description: "Vous recevrez des notifications pour les nouvelles missions",
      });
    } catch (error) {
      console.error('[Notifications] Error:', error);
      
      if (error instanceof Error) {
        if (error.message === 'Notification permission denied') {
          toast({
            title: "Notifications bloquées",
            description: "Veuillez autoriser les notifications dans les paramètres de votre navigateur",
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
      await unsubscribeFromPushNotifications(interpreterId);
      setPermission('default');
      
      toast({
        title: "Notifications désactivées",
        description: "Vous ne recevrez plus de notifications pour les nouvelles missions",
      });
    } catch (error) {
      console.error('[Notifications] Error disabling:', error);
      toast({
        title: "Erreur",
        description: "Impossible de désactiver les notifications",
        variant: "destructive",
      });
    }
  };

  if (!('Notification' in window)) {
    return (
      <div className="text-sm text-yellow-600 flex items-center gap-2">
        <Bell className="h-4 w-4" />
        <span>Votre navigateur ne supporte pas les notifications</span>
      </div>
    );
  }

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