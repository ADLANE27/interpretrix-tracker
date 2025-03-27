
import { useState, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { eventEmitter, EVENT_CONNECTION_STATUS_CHANGE } from '@/lib/events';
import { realtimeService } from '@/services/realtimeService';

export function useConnectionMonitor() {
  const { toast } = useToast();
  const [connectionError, setConnectionError] = useState(false);
  const [reconnectingFor, setReconnectingFor] = useState(0);
  const [isForceReconnecting, setIsForceReconnecting] = useState(false);
  const reconnectAttemptRef = useRef(0);
  const reconnectStartTimeRef = useRef<number | null>(null);
  const reconnectTimerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSuccessfulConnectionRef = useRef<number>(Date.now());

  // Initialize realtime service and listen for connection status changes
  useEffect(() => {
    const cleanup = realtimeService.init();
    
    const handleConnectionStatusChange = (connected: boolean) => {
      console.log('[ConnectionMonitor] Connection status changed:', connected);
      
      if (connected) {
        // Connection is back, reset error state
        if (connectionError) {
          setConnectionError(false);
          setIsForceReconnecting(false);
          toast({
            title: "Connexion rétablie",
            description: "La connexion temps réel a été rétablie",
          });
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
            }
          }, 1000);
        }
        
        setConnectionError(true);
        reconnectAttemptRef.current += 1;
      }
    };
    
    eventEmitter.on(EVENT_CONNECTION_STATUS_CHANGE, handleConnectionStatusChange);
    
    // Initial connection check
    setTimeout(() => {
      const isConnected = realtimeService.isConnected();
      handleConnectionStatusChange(isConnected);
    }, 3000);
    
    return () => {
      eventEmitter.off(EVENT_CONNECTION_STATUS_CHANGE, handleConnectionStatusChange);
      cleanup();
      
      if (reconnectTimerIntervalRef.current) {
        clearInterval(reconnectTimerIntervalRef.current);
      }
    };
  }, [toast, connectionError]);

  // Manual force reconnect handler
  const handleForceReconnect = () => {
    console.log('[ConnectionMonitor] Manual reconnection requested');
    setIsForceReconnecting(true);
    
    // Reset timers for tracking reconnection time
    if (reconnectStartTimeRef.current) {
      reconnectStartTimeRef.current = Date.now();
      setReconnectingFor(0);
    }
    
    // Attempt full service reconnection
    realtimeService.reconnectAll();
    
    toast({
      title: "Reconnexion initiée",
      description: "Tentative de reconnexion en cours...",
    });
    
    // Reset force reconnecting state after a timeout
    setTimeout(() => {
      setIsForceReconnecting(false);
    }, 8000);
  };

  return {
    connectionError,
    reconnectingFor, 
    isForceReconnecting,
    handleForceReconnect
  };
}
