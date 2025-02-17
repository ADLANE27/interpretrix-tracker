
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from "@/integrations/supabase/client";

interface NotificationContextType {
  isSubscribed: boolean;
  isLoading: boolean;
  checkSubscriptionStatus: () => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkSubscriptionStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsLoading(false);
        return false;
      }

      const { data: subscriptions } = await supabase
        .from('web_push_subscriptions')
        .select('status')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .maybeSingle();

      setIsSubscribed(!!subscriptions);
      return !!subscriptions;
    } catch (error) {
      console.error('[NotificationContext] Error checking subscription status:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkSubscriptionStatus();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN') {
        await checkSubscriptionStatus();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <NotificationContext.Provider value={{ isSubscribed, isLoading, checkSubscriptionStatus }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
