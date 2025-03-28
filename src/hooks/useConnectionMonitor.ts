
import { useState, useRef, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { eventEmitter, EVENT_CONNECTION_STATUS_CHANGE } from '@/lib/events';
import { realtimeService } from '@/services/realtime';

export function useConnectionMonitor() {
  const { toast } = useToast();
  const [connectionError, setConnectionError] = useState(false);
  const [reconnectingFor, setReconnectingFor] = useState(0);
  const [isForceReconnecting, setIsForceReconnecting] = useState(false);
  const reconnectAttemptRef = useRef(0);
  const reconnectStartTimeRef = useRef<number | null>(null);
  const reconnectTimerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSuccessfulConnectionRef = useRef<number>(Date.now());
  const toastIdRef = useRef<string | null>(null);
  
  // Initialize realtime service and listen for connection status changes
  useEffect(() => {
    console.log('[ConnectionMonitor] Initializing connection monitor');
    const cleanup = realtimeService.init();
    
    const handleConnectionStatusChange = (connected: boolean) => {
      console.log('[ConnectionMonitor] Connection status changed:', connected);
      
      if (connected) {
        // Connection is back, reset error state
        if (connectionError) {
          setConnectionError(false);
          setIsForceReconnecting(false);
          
          // Dismiss previous error toast if it exists
          if (toastIdRef.current) {
            const result = toast({
              title: "Connexion rétablie",
              description: "La connexion temps réel a été rétablie",
              duration: 3000,
            });
            toastIdRef.current = null;
          } else {
            toast({
              title: "Connexion rétablie",
              description: "La connexion temps réel a été rétablie",
              duration: 3000,
            });
          }
        }
        reconnectAttemptRef.current = 0;
        reconnectStartTimeRef.current = null;
        setReconnectingFor(0);
        
        if (reconnectTimerIntervalRef.current) {
          clearInterval(reconnectTimerIntervalRef.current);
          reconnectTimerIntervalRef.current = null;
        }
        
        lastSuccessfulConnectionRef.current = Date.now();
      } else {
        // Connection lost, start tracking time
        if (!reconnectStartTimeRef.current) {
          reconnectStartTimeRef.current = Date.now();
          
          // Start a timer to track how long we've been reconnecting
          if (reconnectTimerIntervalRef.current) {
            clearInterval(reconnectTimerIntervalRef.current);
          }
          
          reconnectTimerIntervalRef.current = setInterval(() => {
            if (reconnectStartTimeRef.current) {
              const elapsedSeconds = Math.floor((Date.now() - reconnectStartTimeRef.current) / 1000);
              setReconnectingFor(elapsedSeconds);
              
              // Only show toast after 5 seconds of disconnection
              if (elapsedSeconds === 5 && !toastIdRef.current) {
                const result = toast({
                  title: "Problème de connexion",
                  description: "Tentative de reconnexion en cours...",
                  duration: 0, // Persistent until connection is restored
                });
                toastIdRef.current = result.id;
              }
            }
          }, 1000);
        }
        
        setConnectionError(true);
        reconnectAttemptRef.current += 1;
      }
    };
    
    eventEmitter.on(EVENT_CONNECTION_STATUS_CHANGE, handleConnectionStatusChange);
    
    // Initial connection check with delay
    const initialCheckTimeout = setTimeout(() => {
      const isConnected = realtimeService.isConnected();
      if (!isConnected) {
        handleConnectionStatusChange(false);
      }
    }, 5000);
    
    return () => {
      eventEmitter.off(EVENT_CONNECTION_STATUS_CHANGE, handleConnectionStatusChange);
      clearTimeout(initialCheckTimeout);
      cleanup();
      
      if (reconnectTimerIntervalRef.current) {
        clearInterval(reconnectTimerIntervalRef.current);
      }
      
      // Clear any persistent toast on unmount
      if (toastIdRef.current) {
        toast({
          duration: 1,
        });
      }
    };
  }, [toast, connectionError]);

  // Effect to update the connection status when component mounts
  useEffect(() => {
    const isConnected = realtimeService.isConnected();
    if (!isConnected && !connectionError) {
      setConnectionError(true);
    } else if (isConnected && connectionError) {
      setConnectionError(false);
    }
  }, [connectionError]);

  // Manual force reconnect handler
  const handleForceReconnect = useCallback(() => {
    console.log('[ConnectionMonitor] Manual reconnection requested');
    setIsForceReconnecting(true);
    
    // Reset timers for tracking reconnection time
    if (reconnectStartTimeRef.current) {
      reconnectStartTimeRef.current = Date.now();
      setReconnectingFor(0);
    }
    
    // Attempt full service reconnection
    realtimeService.reconnectAll();
    
    // Show toast notification
    toast({
      title: "Reconnexion initiée",
      description: "Tentative de reconnexion en cours...",
      duration: 5000,
    });
    
    // Reset force reconnecting state after a timeout
    setTimeout(() => {
      setIsForceReconnecting(false);
      
      // Check if reconnection was successful
      const isConnected = realtimeService.isConnected();
      if (!isConnected) {
        toast({
          title: "Échec de la reconnexion",
          description: "La connexion n'a pas pu être rétablie. Veuillez rafraîchir la page.",
          variant: "destructive",
          duration: 0,
        });
      }
    }, 8000);
  }, [toast]);

  return {
    connectionError,
    reconnectingFor, 
    isForceReconnecting,
    handleForceReconnect
  };
}
