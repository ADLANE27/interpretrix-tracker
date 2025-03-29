
import React, { ReactNode, useEffect } from "react";
import { realtimeService } from "@/services/realtime";
import { eventEmitter, EVENT_CONNECTION_STATUS_CHANGE } from "@/lib/events";
import { useToast } from "@/hooks/use-toast";
import { ConnectionStateProvider } from "@/contexts/ConnectionStateContext"; 
import { useSupabaseConnection } from "@/hooks/useSupabaseConnection";

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const { toast } = useToast();
  
  // Initialize Supabase connection
  useSupabaseConnection();
  
  // Initialize realtime service
  useEffect(() => {
    const cleanup = realtimeService.init();
    
    const handleConnectionChange = (isConnected: boolean) => {
      if (!isConnected) {
        toast({
          title: "Problème de connexion",
          description: "La connexion temps réel a été perdue. Les mises à jour peuvent être retardées.",
          variant: "warning",
          duration: 5000,
        });
      }
    };
    
    eventEmitter.on(EVENT_CONNECTION_STATUS_CHANGE, handleConnectionChange);
    
    return () => {
      cleanup();
      eventEmitter.off(EVENT_CONNECTION_STATUS_CHANGE, handleConnectionChange);
    };
  }, [toast]);

  return (
    <ConnectionStateProvider>
      {children}
    </ConnectionStateProvider>
  );
}
