
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Bell, BellOff } from "lucide-react";
import { useState, useEffect } from "react";
import { checkPushNotificationStatus, registerPushNotifications } from "@/utils/pushNotifications";

export function NotificationActivationButton() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkNotificationStatus();
  }, []);

  const checkNotificationStatus = async () => {
    try {
      const status = await checkPushNotificationStatus();
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
        // Si déjà activé, désactiver les notifications
        setIsEnabled(false);
        toast({
          title: "Notifications désactivées",
          description: "Vous ne recevrez plus de notifications pour les nouvelles missions",
        });
      } else {
        // Activer les notifications
        const result = await registerPushNotifications();
        
        if (result.success) {
          setIsEnabled(true);
          toast({
            title: "Notifications activées",
            description: "Vous recevrez des notifications pour les nouvelles missions",
          });
        } else {
          throw new Error(result.message);
        }
      }
    } catch (error) {
      console.error('[NotificationActivationButton] Error:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible d'activer les notifications",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
