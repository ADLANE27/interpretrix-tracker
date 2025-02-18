
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Bell } from "lucide-react";
import { useState } from "react";

export function NotificationTestButton() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const sendTestNotification = async () => {
    try {
      setIsLoading(true);

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("[NotificationTestButton] Session error:", sessionError);
        throw new Error("Erreur de session");
      }
      
      if (!session?.user) {
        console.log("[NotificationTestButton] No active session");
        // Rediriger vers la page de connexion
        window.location.href = "/interpreter/login";
        return;
      }

      console.log("[NotificationTestButton] Calling edge function with auth token");
      
      const { data, error } = await supabase.functions.invoke('send-test-notification', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
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
        console.error("[NotificationTestButton] Function error:", error);
        throw error;
      }

      console.log("[NotificationTestButton] Notification sent successfully:", data);

      toast({
        title: "Notification envoyée",
        description: "Vous devriez recevoir une notification de test dans quelques instants.",
      });

    } catch (error) {
      console.error("[NotificationTestButton] Error:", error);
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
