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
    console.log('[Notifications] Environment check:', {
      hasNotificationAPI: 'Notification' in window,
      hasServiceWorkerAPI: 'serviceWorker' in navigator,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      vendor: navigator.vendor
    });

    if (!('Notification' in window)) {
      console.warn('[Notifications] Notifications API not supported');
      return;
    }

    if (!('serviceWorker' in navigator)) {
      console.warn('[Notifications] Service Worker API not supported');
      return;
    }

    console.log('[Notifications] Current permission:', Notification.permission);
    setPermission(Notification.permission);
  };

  const handleEnableNotifications = async () => {
    try {
      setIsSubscribing(true);
      console.log('[Notifications] Starting enable process...');

      const permission = await Notification.requestPermission();
      console.log('[Notifications] Permission result:', permission);

      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }

      await subscribeToPushNotifications(interpreterId);
      setPermission('granted');
      
      toast({
        title: "Notifications activées",
      });
    } catch (error) {
      console.error('[Notifications] Error:', error);
      
      if (error instanceof Error) {
        if (error.message === 'Notification permission denied') {
          toast({
            title: "Notifications bloquées",
            description: "Autorisation requise dans les paramètres",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erreur",
            description: "Impossible d'activer les notifications",
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
      console.log('[Notifications] Starting disable process...');
      await unsubscribeFromPushNotifications(interpreterId);
      setPermission('default');
      
      toast({
        title: "Notifications désactivées",
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

  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return (
      <Button 
        variant="outline" 
        size="icon"
        disabled
        className="h-9 w-9"
        title="Notifications non supportées sur ce navigateur"
      >
        <Bell className="h-4 w-4" />
      </Button>
    );
  }

  if (permission === 'granted') {
    return (
      <Button 
        variant="outline" 
        size="icon"
        onClick={handleDisableNotifications}
        className="h-9 w-9"
        title="Désactiver les notifications"
      >
        <BellOff className="h-4 w-4" />
      </Button>
    );
  }

  if (permission === 'denied') {
    return (
      <Button 
        variant="outline" 
        size="icon"
        className="h-9 w-9 text-red-600 hover:text-red-700"
        onClick={() => {
          toast({
            title: "Notifications bloquées",
            description: "Autorisation requise dans les paramètres",
            variant: "destructive",
          });
        }}
        title="Notifications bloquées"
      >
        <Bell className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button 
      onClick={handleEnableNotifications}
      variant="outline"
      size="icon"
      disabled={isSubscribing}
      className="h-9 w-9"
      title="Activer les notifications"
    >
      <Bell className="h-4 w-4" />
    </Button>
  );
};
