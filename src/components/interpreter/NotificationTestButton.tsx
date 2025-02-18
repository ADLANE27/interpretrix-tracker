
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

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error("Utilisateur non authentifié");
      }

      const { data, error } = await supabase.functions.invoke('send-test-notification', {
        body: {
          userId: session.user.id,
          title: "Test de Notification",
          body: "Si vous voyez cette notification, tout fonctionne correctement !",
          data: {
            url: "/interpreter"
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Notification envoyée",
        description: "Vous devriez recevoir une notification de test dans quelques instants.",
      });

    } catch (error) {
      console.error("Erreur lors de l'envoi de la notification test:", error);
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
