
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Bell, BellOff } from "lucide-react";
import { useState, useEffect } from "react";
import { checkPushNotificationStatus, registerPushNotifications, unregisterPushNotifications } from "@/utils/pushNotifications";

export function NotificationActivationButton() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkNotificationStatus();
  }, []);

  const checkNotificationStatus = async () => {
    try {
      console.log('[NotificationActivationButton] Checking notification status...');
      const status = await checkPushNotificationStatus();
      console.log('[NotificationActivationButton] Current status:', status);
      setIsEnabled(status.enabled);
      setIsLoading(false);
    } catch (error) {
      console.error('[NotificationActivationButton] Error checking status:', error);
      setIsLoading(false);
    }
  };

  const handleToggleNotifications = async () => {
    try {
      setIsLoading(true);

      if (isEnabled) {
        console.log('[NotificationActivationButton] Désactivation des notifications...');
        const result = await unregisterPushNotifications();
        
        if (result.success) {
          setIsEnabled(false);
          toast({
            title: "Notifications désactivées",
            description: "Vous ne recevrez plus de notifications pour les nouvelles missions",
          });
        } else {
          throw new Error(result.message);
        }
      } else {
        console.log('[NotificationActivationButton] Activation des notifications...');
        
        // Force unregister any existing subscriptions first
        await unregisterPushNotifications().catch(console.error);

        // Request permission aggressively
        if (Notification.permission !== 'granted') {
          await Notification.requestPermission();
        }

        // Try to register even if permission was previously denied
        const result = await registerPushNotifications();
        
        if (result.success) {
          setIsEnabled(true);
          toast({
            title: "Notifications activées",
            description: "Vous recevrez des notifications pour les nouvelles missions",
          });
        } else {
          // Always try one more time if it fails
          console.log('[NotificationActivationButton] First attempt failed, trying again...');
          const retryResult = await registerPushNotifications();
          
          if (retryResult.success) {
            setIsEnabled(true);
            toast({
              title: "Notifications activées",
              description: "Vous recevrez des notifications pour les nouvelles missions",
            });
          } else {
            throw new Error(retryResult.message);
          }
        }
      }
    } catch (error) {
      console.error('[NotificationActivationButton] Error:', error);
      // Even if there's an error, try one last time to enable notifications
      try {
        const lastAttempt = await registerPushNotifications();
        if (lastAttempt.success) {
          setIsEnabled(true);
          toast({
            title: "Notifications activées",
            description: "Vous recevrez des notifications pour les nouvelles missions",
          });
          return;
        }
      } catch (e) {
        console.error('[NotificationActivationButton] Final attempt failed:', e);
      }
      
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible d'activer les notifications",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      await checkNotificationStatus();
    }
  };

  if (isLoading) {
    return (
      <Button variant="outline" disabled className="gap-2">
        <Bell className="h-4 w-4" />
        Chargement...
      </Button>
    );
  }

  return (
    <Button
      onClick={handleToggleNotifications}
      variant={isEnabled ? "default" : "outline"}
      className="gap-2"
    >
      {isEnabled ? (
        <>
          <Bell className="h-4 w-4" />
          Notifications activées
        </>
      ) : (
        <>
          <BellOff className="h-4 w-4" />
          Activer les notifications
        </>
      )}
    </Button>
  );
}
