
import { useState, useEffect, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { subscribeToNotifications, unsubscribeFromNotifications } from '@/utils/notifications';
import { Button } from "@/components/ui/button";
import { Bell, BellOff } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseConnection } from '@/hooks/useSupabaseConnection';

export const NotificationManager = () => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const connection = useSupabaseConnection();

  const checkSubscriptionStatus = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsLoading(false);
        return false;
      }

      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('status')
        .eq('interpreter_id', session.user.id)
        .eq('status', 'active')
        .maybeSingle();

      setIsSubscribed(!!subscriptions);
      return !!subscriptions;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSubscriptionStatus();
  }, [checkSubscriptionStatus]);

  const handleSubscribe = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/interpreter/login');
        return;
      }

      if (!connection || connection.state !== 'joined') {
        toast({
          title: "Erreur de connexion",
          description: "La connexion n'est pas établie. Veuillez rafraîchir la page.",
          variant: "destructive",
        });
        return;
      }

      const success = await subscribeToNotifications();
      if (success) {
        await checkSubscriptionStatus();
        toast({
          title: "Notifications activées",
          description: "Vous recevrez désormais des notifications pour les nouvelles missions",
        });
      }
    } catch (error: any) {
      console.error('Error subscribing to notifications:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'activer les notifications. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  };

  const handleUnsubscribe = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/interpreter/login');
        return;
      }

      await unsubscribeFromNotifications();
      await checkSubscriptionStatus();
      toast({
        title: "Notifications désactivées",
        description: "Vous ne recevrez plus de notifications",
      });
    } catch (error: any) {
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
      disabled={!connection || connection.state !== 'joined'}
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
