
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Bell, BellOff, Settings2 } from "lucide-react";
import { useState, useEffect } from "react";
import { checkPushNotificationStatus, registerPushNotifications, unregisterPushNotifications } from "@/utils/pushNotifications";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function NotificationActivationButton() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
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
      setPermissionDenied(status.permission === 'denied');
      setIsLoading(false);
    } catch (error) {
      console.error('[NotificationActivationButton] Error checking status:', error);
      setIsLoading(false);
    }
  };

  const handleToggleNotifications = async () => {
    try {
      setIsLoading(true);

      // If permissions are denied, show the help dialog instead of trying to register
      if (permissionDenied) {
        setShowPermissionDialog(true);
        setIsLoading(false);
        return;
      }

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
        const currentStatus = await checkPushNotificationStatus();
        
        if (currentStatus.enabled) {
          console.log('[NotificationActivationButton] Désactivation de l\'ancien abonnement...');
          await unregisterPushNotifications();
        }

        const result = await registerPushNotifications();
        
        if (result.success) {
          setIsEnabled(true);
          toast({
            title: "Notifications activées",
            description: "Vous recevrez des notifications pour les nouvelles missions",
          });
        } else {
          // If permission was denied during registration, update the state
          if (result.message.includes('Permission refusée')) {
            setPermissionDenied(true);
            setShowPermissionDialog(true);
          }
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
      // Revérifier le statut après l'opération pour s'assurer que l'état local est synchronisé
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
    <>
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
            {permissionDenied ? <Settings2 className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            {permissionDenied ? "Configurer les notifications" : "Activer les notifications"}
          </>
        )}
      </Button>

      <Dialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Autoriser les notifications</DialogTitle>
            <DialogDescription className="space-y-4 pt-4">
              <p>
                Pour recevoir des notifications de nouvelles missions, vous devez autoriser les notifications dans les paramètres de votre navigateur.
              </p>
              <div className="space-y-2">
                <p className="font-medium">Comment autoriser les notifications :</p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Cliquez sur l'icône de cadenas à gauche de la barre d'adresse</li>
                  <li>Trouvez le paramètre "Notifications"</li>
                  <li>Changez le paramètre sur "Autoriser"</li>
                  <li>Rafraîchissez la page</li>
                </ol>
              </div>
              <p className="text-sm text-muted-foreground">
                Une fois les notifications autorisées, vous pourrez les activer en cliquant sur le bouton "Activer les notifications".
              </p>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
