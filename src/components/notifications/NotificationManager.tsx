
import { useEffect, useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { subscribeToNotifications, unsubscribeFromNotifications } from '@/utils/notifications';
import { Button } from "@/components/ui/button";
import { Bell, BellOff } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";

export const NotificationManager = () => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkSubscriptionStatus();
  }, []);

  const checkSubscriptionStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('status')
        .eq('interpreter_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      setIsSubscribed(!!subscriptions);
      setIsLoading(false);
    } catch (error) {
      console.error('Error checking subscription status:', error);
      setIsLoading(false);
    }
  };

  const handleSubscribe = async () => {
    try {
      const success = await subscribeToNotifications();
      if (success) {
        setIsSubscribed(true);
        toast({
          title: "Notifications activées",
          description: "Vous recevrez désormais des notifications pour les nouvelles missions",
        });
      } else {
        throw new Error('Failed to subscribe to notifications');
      }
    } catch (error) {
      console.error('Error subscribing to notifications:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'activer les notifications",
        variant: "destructive",
      });
    }
  };

  const handleUnsubscribe = async () => {
    try {
      const success = await unsubscribeFromNotifications();
      if (success) {
        setIsSubscribed(false);
        toast({
          title: "Notifications désactivées",
          description: "Vous ne recevrez plus de notifications",
        });
      } else {
        throw new Error('Failed to unsubscribe from notifications');
      }
    } catch (error) {
      console.error('Error unsubscribing from notifications:', error);
      toast({
        title: "Erreur",
        description: "Impossible de désactiver les notifications",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
      className="flex items-center gap-2"
    >
      {isSubscribed ? (
        <>
          <BellOff className="h-4 w-4" />
          Désactiver les notifications
        </>
      ) : (
        <>
          <Bell className="h-4 w-4" />
          Activer les notifications
        </>
      )}
    </Button>
  );
};

