
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { subscribeToPushNotifications, unsubscribeFromPushNotifications, sendTestNotification } from '@/lib/pushNotifications';
import { Bell, BellOff, Send, RefreshCw } from 'lucide-react';

export const NotificationPermission = ({ interpreterId }: { interpreterId: string }) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const { toast } = useToast();

  const checkNotificationPermission = async () => {
    try {
      console.log('[Notifications] Starting permission check');
      
      if (!('Notification' in window)) {
        console.warn('[Notifications] Notifications API not supported');
        return;
      }

      if (!('serviceWorker' in navigator)) {
        console.warn('[Notifications] Service Worker API not supported');
        return;
      }

      // Forcer une nouvelle vérification des permissions
      const currentPermission = await Notification.permission;
      console.log('[Notifications] Current permission:', currentPermission);
      
      // Vérifier si un service worker est actif
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        console.log('[Notifications] Found service worker registration:', registration.scope);
        
        const subscription = await registration.pushManager.getSubscription();
        console.log('[Notifications] Active subscription:', subscription ? 'Yes' : 'No');
        
        if (subscription) {
          try {
            // Vérifier si la souscription est toujours valide
            await subscription.getKey('p256dh');
            setPermission('granted');
            console.log('[Notifications] Subscription is valid');
          } catch (error) {
            console.warn('[Notifications] Invalid subscription, will clean up:', error);
            setPermission('default');
            // Nettoyer la souscription invalide
            await subscription.unsubscribe();
          }
        } else {
          console.log('[Notifications] No active subscription found');
          setPermission('default');
        }
      } else {
        console.log('[Notifications] No service worker registration found');
        setPermission('default');
      }
    } catch (error) {
      console.error('[Notifications] Error checking permissions:', error);
      setPermission('default');
    }
  };

  useEffect(() => {
    checkNotificationPermission();
    
    // Ajouter un listener pour les changements de permission
    const handlePermissionChange = () => {
      console.log('[Notifications] Permission changed to:', Notification.permission);
      checkNotificationPermission();
    };

    // Si l'API est supportée, ajouter le listener
    if ('Notification' in window) {
      // @ts-ignore - L'API est en cours de standardisation
      if (navigator.permissions?.query) {
        navigator.permissions.query({ name: 'notifications' })
          .then(permissionStatus => {
            permissionStatus.onchange = handlePermissionChange;
          })
          .catch(console.error);
      }
    }

    return () => {
      // Cleanup si nécessaire
    };
  }, []);

  const handleEnableNotifications = async () => {
    try {
      setIsSubscribing(true);
      console.log('[Notifications] Starting enable process...');
      
      const currentPermission = await Notification.permission;
      console.log('[Notifications] Current permission before request:', currentPermission);
      
      // Vérifier si le navigateur supporte les Service Workers
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Workers non supportés par ce navigateur');
      }

      // Vérifier si le navigateur supporte les notifications
      if (!('Notification' in window)) {
        throw new Error('Notifications non supportées par ce navigateur');
      }

      // Réinitialiser les service workers existants
      const registrations = await navigator.serviceWorker.getRegistrations();
      console.log('[Notifications] Unregistering existing service workers:', registrations.length);
      for (const registration of registrations) {
        await registration.unregister();
      }
      
      const result = await subscribeToPushNotifications(interpreterId);
      console.log('[Notifications] Subscription result:', result);
      
      // Vérifier à nouveau les permissions après la souscription
      await checkNotificationPermission();
      
      toast({
        title: "Notifications activées",
        description: "Vous recevrez des notifications pour les nouvelles missions",
      });
    } catch (error: any) {
      console.error('[Notifications] Error:', error);
      
      // Vérifier à nouveau les permissions en cas d'erreur
      const currentPermission = await Notification.permission;
      console.log('[Notifications] Permission after error:', currentPermission);
      
      if (currentPermission === 'denied') {
        toast({
          title: "Notifications bloquées",
          description: "Pour activer les notifications, veuillez les autoriser dans les paramètres de votre navigateur (en cliquant sur l'icône 🔒 à gauche de l'URL), puis réessayez",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erreur",
          description: error.message || "Une erreur est survenue. Veuillez rafraîchir la page et réessayer.",
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
      await checkNotificationPermission();
      
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
      console.log('[Notifications] Sending test notification...');
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

  const handleRefresh = async () => {
    console.log('[Notifications] Refreshing notification state...');
    await checkNotificationPermission();
    toast({
      title: "État des notifications actualisé",
      description: "L'état des notifications a été vérifié à nouveau",
    });
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
    <div className="flex gap-2">
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
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRefresh}
        className="flex items-center gap-2"
        title="Actualiser l'état des notifications"
      >
        <RefreshCw className="h-4 w-4" />
      </Button>
    </div>
  );
};
