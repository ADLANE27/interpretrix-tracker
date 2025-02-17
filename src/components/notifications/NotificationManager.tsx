
import { useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { subscribeToNotifications, unsubscribeFromNotifications } from '@/utils/notifications';
import { Button } from "@/components/ui/button";
import { Bell, BellOff } from 'lucide-react';
import { useNotification } from '@/contexts/NotificationContext';

export const NotificationManager = () => {
  const { isSubscribed, isLoading, checkSubscriptionStatus } = useNotification();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubscribe = useCallback(async () => {
    try {
      const success = await subscribeToNotifications();
      if (success) {
        await checkSubscriptionStatus();
        toast({
          title: "Notifications activées",
          description: "Vous recevrez désormais des notifications pour les nouvelles missions",
        });
      }
    } catch (error: any) {
      console.error('[NotificationManager] Error subscribing:', error);
      if (error.message === 'User not authenticated') {
        navigate('/interpreter/login');
        return;
      }
      
      toast({
        title: "Erreur",
        description: "Impossible d'activer les notifications. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  }, [checkSubscriptionStatus, navigate, toast]);

  const handleUnsubscribe = useCallback(async () => {
    try {
      await unsubscribeFromNotifications();
      await checkSubscriptionStatus();
      toast({
        title: "Notifications désactivées",
        description: "Vous ne recevrez plus de notifications",
      });
    } catch (error: any) {
      console.error('[NotificationManager] Error unsubscribing:', error);
      if (error.message === 'User not authenticated') {
        navigate('/interpreter/login');
        return;
      }
      
      toast({
        title: "Erreur",
        description: "Impossible de désactiver les notifications",
        variant: "destructive",
      });
    }
  }, [checkSubscriptionStatus, navigate, toast]);

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
