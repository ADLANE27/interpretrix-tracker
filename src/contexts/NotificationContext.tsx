
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from "@/integrations/supabase/client";

interface NotificationContextType {
  isSubscribed: boolean;
  isLoading: boolean;
  checkSubscriptionStatus: () => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const SERVER_URL = 'http://localhost:3000';

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

      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        setIsLoading(false);
        return false;
      }

      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        setIsLoading(false);
        return false;
      }

      // Verify subscription with server
      const response = await fetch(`${SERVER_URL}/api/notifications/status`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint
        })
      });

      if (!response.ok) {
        console.error('[NotificationContext] Server status check failed');
        setIsSubscribed(false);
        return false;
      }

      const { isActive } = await response.json();
      setIsSubscribed(isActive);
      return isActive;
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
