
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { subscribeToPushNotifications, unsubscribeFromPushNotifications } from '@/lib/pushNotifications';
import { Bell, BellOff } from 'lucide-react';

export const NotificationPermission = ({ interpreterId }: { interpreterId: string }) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkStatus = async () => {
      if (!('Notification' in window)) {
        return;
      }

      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        setPermission(subscription ? 'granted' : Notification.permission);
      } else {
        setPermission(Notification.permission);
      }
    };

    checkStatus();
  }, []);

  const handleEnable = async () => {
    try {
      setIsLoading(true);
      await subscribeToPushNotifications(interpreterId);
      setPermission('granted');
      toast({
        title: "Notifications activées",
        description: "Vous recevrez des notifications pour les nouvelles missions",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'activer les notifications",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable = async () => {
    try {
      setIsLoading(true);
      await unsubscribeFromPushNotifications(interpreterId);
      setPermission('default');
      toast({
        title: "Notifications désactivées",
        description: "Vous ne recevrez plus de notifications",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de désactiver les notifications",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return (
      <Button 
        variant="outline" 
        size="sm"
        disabled
        className="flex items-center gap-2"
      >
        <Bell className="h-4 w-4" />
        Notifications non supportées
      </Button>
    );
  }

  return (
    <Button 
      variant="outline" 
      size="sm"
      onClick={permission === 'granted' ? handleDisable : handleEnable}
      disabled={isLoading}
      className="flex items-center gap-2"
    >
      {permission === 'granted' ? (
        <>
          <BellOff className="h-4 w-4" />
          {isLoading ? 'Désactivation...' : 'Désactiver les notifications'}
        </>
      ) : (
        <>
          <Bell className="h-4 w-4" />
          {isLoading ? 'Activation...' : 'Activer les notifications'}
        </>
      )}
    </Button>
  );
};
