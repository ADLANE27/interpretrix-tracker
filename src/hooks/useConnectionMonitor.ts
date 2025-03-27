
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export const useConnectionMonitor = () => {
  const [connectionError, setConnectionError] = useState(false);
  const [reconnectingFor, setReconnectingFor] = useState(0);
  const [isForceReconnecting, setIsForceReconnecting] = useState(false);
  const { toast } = useToast();

  const handleForceReconnect = useCallback(async () => {
    if (isForceReconnecting) return;

    setIsForceReconnecting(true);
    toast({
      title: "Reconnexion",
      description: "Tentative de reconnexion en cours...",
    });

    try {
      // Wait a bit to show the reconnection state
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Reset state
      setConnectionError(false);
      setReconnectingFor(0);
    } finally {
      setIsForceReconnecting(false);
    }
  }, [isForceReconnecting, toast]);

  return {
    connectionError,
    reconnectingFor,
    isForceReconnecting,
    handleForceReconnect,
    setConnectionError,
    setReconnectingFor
  };
};
