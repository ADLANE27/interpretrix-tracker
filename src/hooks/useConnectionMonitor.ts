
import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { realtimeService } from '@/services/realtimeService';
import { eventEmitter, EVENT_CONNECTION_STATUS_CHANGE } from '@/lib/events';
import { CONNECTION_CONSTANTS } from './supabase-connection/constants';

export const useConnectionMonitor = () => {
  const [connectionError, setConnectionError] = useState<boolean>(false);
  const [reconnectingFor, setReconnectingFor] = useState<number>(0);
  const [isForceReconnecting, setIsForceReconnecting] = useState<boolean>(false);
  const disconnectedSince = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast, dismiss } = useToast();
  const toastIdRef = useRef<string | null>(null);

  // Clear any existing connection error toast
  const clearErrorToast = useCallback(() => {
    if (toastIdRef.current) {
      dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }
  }, [dismiss]);

  // Show connection error toast
  const showConnectionErrorToast = useCallback(() => {
    clearErrorToast();
    
    // Create a new toast with a unique ID
    const id = `connection-error-${Date.now()}`;
    toastIdRef.current = id;
    
    toast({
      id,
      title: "Problème de connexion",
      description: "La connexion au serveur a été perdue. Tentative de reconnexion en cours...",
      variant: "destructive",
      duration: 0, // Keep it visible until dismissed
    });
  }, [toast, clearErrorToast]);

  // Show connection restored toast
  const showConnectionRestoredToast = useCallback(() => {
    clearErrorToast();
    
    const id = `connection-restored-${Date.now()}`;
    toastIdRef.current = id;
    
    toast({
      id,
      title: "Connexion rétablie",
      description: "La connexion au serveur a été rétablie avec succès.",
      variant: "success",
      duration: 5000,
    });
  }, [toast, clearErrorToast]);

  // Update the reconnection timer
  useEffect(() => {
    if (!connectionError) {
      // Reset timer when connected
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      disconnectedSince.current = null;
      setReconnectingFor(0);
      return;
    }

    // Start tracking disconnection time
    if (!disconnectedSince.current) {
      disconnectedSince.current = Date.now();
    }

    // Update the timer every second
    intervalRef.current = setInterval(() => {
      if (disconnectedSince.current) {
        const seconds = Math.floor((Date.now() - disconnectedSince.current) / 1000);
        setReconnectingFor(seconds);
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [connectionError]);

  // Listen for connection status changes
  useEffect(() => {
    const handleConnectionStatusChange = (connected: boolean) => {
      console.log('[ConnectionMonitor] Connection status changed:', connected);
      
      setConnectionError(!connected);
      
      if (connected) {
        // Connection restored
        if (disconnectedSince.current) {
          showConnectionRestoredToast();
          disconnectedSince.current = null;
          setReconnectingFor(0);
        }
      } else {
        // Connection lost
        if (!disconnectedSince.current) {
          disconnectedSince.current = Date.now();
          showConnectionErrorToast();
        }
      }
    };
    
    eventEmitter.on(EVENT_CONNECTION_STATUS_CHANGE, handleConnectionStatusChange);
    
    // Start monitoring connection
    realtimeService.monitorConnection();
    
    // Check current connection status
    const isCurrentlyConnected = realtimeService.isConnected();
    setConnectionError(!isCurrentlyConnected);
    
    if (!isCurrentlyConnected && !disconnectedSince.current) {
      disconnectedSince.current = Date.now();
      showConnectionErrorToast();
    }
    
    return () => {
      eventEmitter.off(EVENT_CONNECTION_STATUS_CHANGE, handleConnectionStatusChange);
      clearErrorToast();
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [showConnectionErrorToast, showConnectionRestoredToast, clearErrorToast]);

  // Handler for manual force reconnect
  const handleForceReconnect = useCallback(() => {
    if (isForceReconnecting) return;
    
    setIsForceReconnecting(true);
    clearErrorToast();
    
    // Show reconnecting toast
    const id = `force-reconnect-${Date.now()}`;
    toastIdRef.current = id;
    
    toast({
      id,
      title: "Reconnexion en cours",
      description: "Tentative de reconnexion forcée...",
      variant: "default",
      duration: 0,
    });
    
    // Attempt reconnection
    realtimeService.reconnectAll();
    
    // Reset state after a delay
    setTimeout(() => {
      setIsForceReconnecting(false);
      clearErrorToast();
      
      // Check if reconnection was successful
      const isConnected = realtimeService.isConnected();
      
      if (isConnected) {
        showConnectionRestoredToast();
        setConnectionError(false);
        disconnectedSince.current = null;
        setReconnectingFor(0);
      } else {
        showConnectionErrorToast();
      }
    }, 3000);
  }, [isForceReconnecting, toast, clearErrorToast, showConnectionRestoredToast, showConnectionErrorToast]);

  return {
    connectionError,
    reconnectingFor,
    isForceReconnecting,
    handleForceReconnect,
  };
};
