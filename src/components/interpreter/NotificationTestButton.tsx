
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Bell } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerPushNotifications, checkPushNotificationStatus } from "@/utils/pushNotifications";

export function NotificationTestButton() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const sendTestNotification = async () => {
    try {
      setIsLoading(true);
      console.log('[NotificationTestButton] Starting test notification process');

      // 1. Check if the browser supports notifications
      if (!('Notification' in window)) {
        throw new Error('Ce navigateur ne prend pas en charge les notifications');
      }

      // 2. Check current notification permission status
      const status = await checkPushNotificationStatus();
      console.log('[NotificationTestButton] Current notification status:', status);

      // 3. If permission is denied, show error
      if (status.permission === 'denied') {
        throw new Error('Les notifications sont bloquées par votre navigateur. Veuillez les activer dans les paramètres de votre navigateur.');
      }

      // 4. If notifications aren't enabled, try to register them
      if (!status.enabled) {
        console.log('[NotificationTestButton] Notifications not enabled, attempting registration');
        const registration = await registerPushNotifications();
        if (!registration.success) {
          throw new Error(registration.message);
        }
      }

      // 5. Get session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) {
        console.log('[NotificationTestButton] No active session');
        toast({
          title: "Non authentifié",
          description: "Vous devez être connecté pour utiliser cette fonctionnalité",
          variant: "destructive"
        });
        navigate("/interpreter/login");
        return;
      }

      console.log('[NotificationTestButton] Calling edge function');
      
      // 6. Send test notification
      const { data, error } = await supabase.functions.invoke('send-test-notification', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          userId: session.user.id,
          title: "Test de Notification",
          body: "Si vous voyez cette notification, tout fonctionne correctement !",
          data: {
            url: "/interpreter"
          }
        }
      });

      if (error) {
        console.error('[NotificationTestButton] Edge function error:', error);
        throw error;
      }

      console.log('[NotificationTestButton] Notification sent:', data);

      toast({
        title: "Notification envoyée",
        description: "Vous devriez recevoir une notification de test dans quelques instants.",
      });

    } catch (error) {
      console.error('[NotificationTestButton] Error:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de l'envoi de la notification",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={sendTestNotification}
      disabled={isLoading}
      variant="outline"
      className="gap-2"
    >
      <Bell className="h-4 w-4" />
      {isLoading ? "Envoi..." : "Tester les notifications"}
    </Button>
  );
}
