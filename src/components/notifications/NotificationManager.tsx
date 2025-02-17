
import { useEffect, useState, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { subscribeToNotifications, unsubscribeFromNotifications } from '@/utils/notifications';
import { Button } from "@/components/ui/button";
import { Bell, BellOff } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";

export const NotificationManager = () => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  const checkSubscriptionStatus = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsLoading(false);
        return;
      }

      const { data: subscriptions, error: subscriptionError } = await supabase
        .from('push_subscriptions')
        .select('status')
        .eq('interpreter_id', session.user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (subscriptionError) {
        console.error('Error checking subscription status:', subscriptionError);
        if (subscriptionError.code === 'PGRST116') {
          setIsLoading(false);
          return;
        }
      }

      setIsSubscribed(!!subscriptions);
      setIsLoading(false);
    } catch (error) {
      console.error('Error checking subscription status:', error);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const setupAuth = async () => {
      if (!mounted) return;

      await checkSubscriptionStatus();

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_OUT' || !session) {
          setIsSubscribed(false);
          setIsLoading(false);
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await checkSubscriptionStatus();
        }
      });

      return subscription;
    };

    const subscription = setupAuth();

    return () => {
      mounted = false;
      // Clean up subscription
      if (subscription) {
        subscription.then(sub => sub.unsubscribe());
      }
    };
  }, [checkSubscriptionStatus]);

  const handleSubscribe = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/interpreter/login');
        return;
      }

      await subscribeToNotifications();
      await checkSubscriptionStatus();
      toast({
        title: "Notifications activées",
        description: "Vous recevrez désormais des notifications pour les nouvelles missions",
      });
    } catch (error: any) {
      console.error('Error subscribing to notifications:', error);
      if (error.message?.includes('refresh_token_not_found')) {
        navigate('/interpreter/login');
        return;
      }
      toast({
        title: "Erreur",
        description: "Impossible d'activer les notifications",
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
      if (error.message?.includes('refresh_token_not_found')) {
        navigate('/interpreter/login');
        return;
      }
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
