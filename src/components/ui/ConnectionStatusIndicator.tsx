
import React, { useEffect, useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { eventEmitter, EVENT_CONNECTION_STATUS_CHANGE } from '@/lib/events';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

export function ConnectionStatusIndicator() {
  const [isConnected, setIsConnected] = useState(true);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [showIndicator, setShowIndicator] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    const handleConnectionStatus = (connected: boolean) => {
      setIsConnected(connected);
      
      if (!connected) {
        setShowIndicator(true);
        toast({
          title: "Problème de connexion",
          description: "La connexion temps réel a été interrompue",
          variant: "destructive",
          duration: 5000,
        });
      } else if (showIndicator) {
        // When reconnected, show success toast and hide after a delay
        toast({
          title: "Connexion rétablie",
          description: "La connexion temps réel est de nouveau active",
          variant: "default",
          duration: 3000,
        });
        
        // Hide the indicator after a delay
        setTimeout(() => {
          setShowIndicator(false);
        }, 5000);
      }
    };
    
    eventEmitter.on(EVENT_CONNECTION_STATUS_CHANGE, handleConnectionStatus);
    
    return () => {
      eventEmitter.off(EVENT_CONNECTION_STATUS_CHANGE, handleConnectionStatus);
    };
  }, [toast, showIndicator]);
  
  const handleForceReconnect = () => {
    setIsReconnecting(true);
    
    // Force page reload to reestablish all connections
    window.location.reload();
  };
  
  if (!showIndicator) {
    return null;
  }
  
  return (
    <AnimatePresence>
      {showIndicator && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ duration: 0.3 }}
          className={cn(
            "fixed bottom-5 right-5 rounded-full shadow-lg z-50 flex items-center gap-2 p-3",
            isConnected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          )}
        >
          {isConnected ? (
            <Wifi className="h-5 w-5" />
          ) : isReconnecting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <WifiOff className="h-5 w-5" />
              <Button
                size="sm"
                variant="outline"
                className="bg-white border border-red-200 text-red-800 text-xs px-2 py-1 h-auto"
                onClick={handleForceReconnect}
                disabled={isReconnecting}
              >
                {isReconnecting ? "Reconnexion..." : "Reconnecter"}
              </Button>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
