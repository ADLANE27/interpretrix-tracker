
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { subscribeToPushNotifications, unsubscribeFromPushNotifications, sendTestNotification } from '@/lib/pushNotifications';
import { Bell, BellOff, Send } from 'lucide-react';

export const NotificationPermission = ({ interpreterId }: { interpreterId: string }) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkNotificationPermission();
  }, []);

  const checkNotificationPermission = async () => {
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

    // Vérifier l'état actuel des permissions
    const currentPermission = await Notification.permission;
    console.log('[Notifications] Current permission:', currentPermission);
    setPermission(currentPermission);

    // Si les permissions sont accordées, vérifier le service worker
    if (currentPermission === 'granted') {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          console.log('[Notifications] No active subscription found, resetting permission');
          setPermission('default');
        }
      } catch (error) {
        console.error('[Notifications] Error checking service worker:', error);
      }
    }
  };

  const handleEnableNotifications = async () => {
    try {
      setIsSubscribing(true);
      console.log('[Notifications] Starting enable process...');

      // Tenter d'activer les notifications
      await subscribeToPushNotifications(interpreterId);
      
      // Mettre à jour l'état des permissions après l'activation
      const newPermission = await Notification.permission;
      setPermission(newPermission);

      if (newPermission === 'granted') {
        toast({
          title: "Notifications activées",
          description: "Vous recevrez des notifications pour les nouvelles missions",
        });
      } else {
        // Si les notifications ne sont pas activées après la tentative
        console.log('[Notifications] Permissions not granted after attempt:', newPermission);
        toast({
          title: "Notifications non activées",
          description: "Veuillez autoriser les notifications dans les paramètres de votre navigateur puis réessayer",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('[Notifications] Error:', error);
      
      // Vérifier l'état actuel des permissions pour un message plus précis
      const currentPermission = await Notification.permission;
      
      if (currentPermission === 'denied') {
        toast({
          title: "Notifications bloquées",
          description: "Pour activer les notifications, veuillez les autoriser dans les paramètres de votre navigateur puis réessayer",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erreur",
          description: "Impossible d'activer les notifications. Veuillez réessayer.",
          variant: "destructive",
        });
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

  const handleTestNotification = async () => {
    try {
      setIsTesting(true);
      await sendTestNotification(interpreterId);
      toast({
        title: "Notification envoyée",
        description: "Si les notifications sont correctement configurées, vous devriez la recevoir dans quelques secondes.",
      });
    } catch (error) {
      console.error('[Notifications] Test error:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la notification de test",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return (
      <Button 
        variant="outline" 
        size="sm"
        disabled
        className="flex items-center gap-2"
        title="Pour recevoir des notifications, veuillez utiliser Safari (iOS 16.4+) ou ajouter l'application à votre écran d'accueil"
      >
        <Bell className="h-4 w-4" />
        Notifications non supportées
      </Button>
    );
  }

  if (permission === 'granted') {
    return (
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleDisableNotifications}
          className="flex items-center gap-2"
        >
          <BellOff className="h-4 w-4" />
          Désactiver les notifications
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleTestNotification}
          disabled={isTesting}
          className="flex items-center gap-2"
        >
          <Send className="h-4 w-4" />
          {isTesting ? 'Envoi...' : 'Tester'}
        </Button>
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
