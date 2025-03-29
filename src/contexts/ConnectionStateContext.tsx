
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { eventEmitter, EVENT_CONNECTION_STATUS_CHANGE } from '@/lib/events';

type ConnectionState = {
  isConnected: boolean;
  lastConnectedAt: number | null;
  lastDisconnectedAt: number | null;
};

type ConnectionContextType = {
  connectionState: ConnectionState;
  retryConnection: () => void;
};

const defaultState: ConnectionState = {
  isConnected: true,
  lastConnectedAt: Date.now(),
  lastDisconnectedAt: null
};

const ConnectionStateContext = createContext<ConnectionContextType>({
  connectionState: defaultState,
  retryConnection: () => {}
});

export const ConnectionStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(() => {
    // Try to restore state from sessionStorage
    try {
      const saved = sessionStorage.getItem('app-connection-state');
      return saved ? JSON.parse(saved) : defaultState;
    } catch (e) {
      return defaultState;
    }
  });

  // Listen for connection status changes
  useEffect(() => {
    const handleConnectionChange = (isConnected: boolean) => {
      const now = Date.now();
      setConnectionState(prev => {
        const newState = {
          isConnected,
          lastConnectedAt: isConnected ? now : prev.lastConnectedAt,
          lastDisconnectedAt: !isConnected ? now : prev.lastDisconnectedAt
        };
        
        // Store in sessionStorage
        try {
          sessionStorage.setItem('app-connection-state', JSON.stringify(newState));
        } catch (e) {
          console.error('Failed to store connection state:', e);
        }
        
        return newState;
      });
    };

    eventEmitter.on(EVENT_CONNECTION_STATUS_CHANGE, handleConnectionChange);
    return () => {
      eventEmitter.off(EVENT_CONNECTION_STATUS_CHANGE, handleConnectionChange);
    };
  }, []);

  // Function to trigger a manual reconnection attempt
  const retryConnection = useCallback(() => {
    console.log('Manual reconnection attempt triggered');
    // Emit a temporary "connected" event to trigger UI updates
    eventEmitter.emit(EVENT_CONNECTION_STATUS_CHANGE, true);
    
    // Import and use the realtimeService but with dynamic import to avoid circular dependencies
    import('@/services/realtime').then(({ realtimeService }) => {
      realtimeService.reconnectAll();
    });
  }, []);

  const value = { connectionState, retryConnection };

  return (
    <ConnectionStateContext.Provider value={value}>
      {children}
    </ConnectionStateContext.Provider>
  );
};

export const useConnectionState = () => useContext(ConnectionStateContext);
