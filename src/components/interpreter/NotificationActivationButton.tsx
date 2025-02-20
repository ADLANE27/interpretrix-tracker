
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Bell, BellOff } from "lucide-react";
import { useState, useEffect } from "react";
import { 
  checkPushNotificationStatus, 
  registerPushNotifications, 
  unregisterPushNotifications 
} from "@/utils/push-notifications";

export function NotificationActivationButton() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const checkNotificationStatus = async () => {
    try {
      const status = await checkPushNotificationStatus();
      setIsEnabled(status.enabled);
    } catch (error) {
      console.error('[NotificationActivationButton] Error checking status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkNotificationStatus();
  }, []);

  const handleToggleNotifications = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    let shouldCheckStatus = false;

    try {
      if (isEnabled) {
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
        // Clean attempt to register
        const result = await registerPushNotifications();
        
        if (result.success) {
          setIsEnabled(true);
          toast({
            title: "Notifications activées",
            description: "Vous recevrez des notifications pour les nouvelles missions",
          });
        } else {
          // Only retry once if first attempt fails
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
      shouldCheckStatus = true;
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible d'activer les notifications",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      // Only check status if we encountered an error
      if (shouldCheckStatus) {
        await checkNotificationStatus();
      }
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
