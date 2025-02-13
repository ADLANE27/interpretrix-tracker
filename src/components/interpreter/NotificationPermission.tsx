
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { subscribeToPushNotifications, unsubscribeFromPushNotifications, sendTestNotification } from '@/lib/pushNotifications';
import { Bell, BellOff, Send, RefreshCw } from 'lucide-react';

export const NotificationPermission = ({ interpreterId }: { interpreterId: string }) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const checkNotificationPermission = async () => {
    try {
      console.log('[Notifications] Starting permission check');
      
      // Check basic browser support
      if (!('Notification' in window)) {
        console.warn('[Notifications] Notifications API not supported');
        toast({
          title: "Notifications non supportées",
          description: "Votre navigateur ne supporte pas les notifications push",
          variant: "destructive",
        });
        return;
      }

      if (!('serviceWorker' in navigator)) {
        console.warn('[Notifications] Service Worker API not supported');
        toast({
          title: "Notifications non supportées",
          description: "Votre navigateur ne supporte pas les Service Workers",
          variant: "destructive",
        });
        return;
      }

      // Check current permission status
      const currentPermission = await Notification.permission;
      console.log('[Notifications] Current permission:', currentPermission);
      
      // Check active service worker and subscription
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          // Verify if the subscription is still valid
          try {
            await fetch(subscription.endpoint, { method: 'HEAD' });
            setPermission('granted');
          } catch {
            console.log('[Notifications] Subscription expired, cleaning up...');
            await subscription.unsubscribe();
            await unsubscribeFromPushNotifications(interpreterId);
            setPermission('default');
          }
        } else {
          setPermission('default');
        }
      } else {
        setPermission('default');
      }
    } catch (error) {
      console.error('[Notifications] Error checking permissions:', error);
      setPermission('default');
      toast({
        title: "Erreur",
        description: "Impossible de vérifier l'état des notifications",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    checkNotificationPermission();
    
    // Set up periodic checks for subscription validity
    const intervalId = setInterval(checkNotificationPermission, 30 * 60 * 1000); // Check every 30 minutes
    
    return () => clearInterval(intervalId);
  }, []);

  const handleEnableNotifications = async () => {
    try {
      setIsSubscribing(true);
      console.log('[Notifications] Starting enable process...');
      
      // Request permission
      const permissionResult = await Notification.requestPermission();
      console.log('[Notifications] Permission result:', permissionResult);
      
      if (permissionResult !== 'granted') {
        throw new Error('Permission refusée');
      }

      // Register service worker
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Worker non supporté');
      }

      // Unregister existing service workers
      const existingRegistrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of existingRegistrations) {
        await reg.unregister();
      }

      // Register new service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      await registration.update();
      
      // Subscribe to push notifications
      const result = await subscribeToPushNotifications(interpreterId);
      console.log('[Notifications] Subscription result:', result);

      if (result) {
        setPermission('granted');
        toast({
          title: "Notifications activées",
          description: "Vous recevrez des notifications pour les nouvelles missions",
        });
      }
    } catch (error: any) {
      console.error('[Notifications] Error:', error);
      
      if (error.message.includes('Permission')) {
        toast({
          title: "Notifications bloquées",
          description: "Pour activer les notifications, veuillez les autoriser dans les paramètres de votre navigateur (en cliquant sur l'icône 🔒 à gauche de l'URL), puis réessayez",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erreur",
          description: "Une erreur est survenue lors de l'activation des notifications. Veuillez réessayer.",
          variant: "destructive",
        });
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

  const handleTestNotification = async () => {
    if (isTesting) return;
    
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
        description: "Impossible d'envoyer la notification de test. Veuillez vérifier que les notifications sont bien activées.",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    try {
      setIsRefreshing(true);
      console.log('[Notifications] Refreshing notification state...');
      await checkNotificationPermission();
      toast({
        title: "État des notifications actualisé",
        description: "L'état des notifications a été vérifié à nouveau",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Check browser compatibility
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

  return (
    <div className="flex gap-2">
      {permission === 'granted' ? (
        <>
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
        </>
      ) : (
        <>
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
            disabled={isRefreshing}
            className="flex items-center gap-2"
            title="Actualiser l'état des notifications"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </>
      )}
    </div>
  );
};
