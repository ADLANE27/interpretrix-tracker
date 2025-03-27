
import { useEffect, useCallback } from 'react';
import { realtimeService } from '@/services/realtimeService';
import { eventEmitter, EVENT_CONNECTION_STATUS_CHANGE } from '@/lib/events';

interface UseMissionRealtimeOptions {
  onUpdate?: () => void;
  onConnectionChange?: (connected: boolean) => void;
}

/**
 * A hook for subscribing to mission-related realtime updates
 */
export const useMissionRealtime = (options: UseMissionRealtimeOptions = {}) => {
  const { onUpdate, onConnectionChange } = options;
  
  // Initialize the realtime service
  useEffect(() => {
    const cleanup = realtimeService.init();
    return cleanup;
  }, []);
  
  // Subscribe to connection status changes
  useEffect(() => {
    if (!onConnectionChange) return;
    
    const handleConnectionChange = (connected: boolean) => {
      onConnectionChange(connected);
    };
    
    eventEmitter.on(EVENT_CONNECTION_STATUS_CHANGE, handleConnectionChange);
    
    return () => {
      eventEmitter.off(EVENT_CONNECTION_STATUS_CHANGE, handleConnectionChange);
    };
  }, [onConnectionChange]);
  
  // Subscribe to mission updates
  useEffect(() => {
    if (!onUpdate) return;
    
    // Subscribe to interpretation missions
    const missionCleanup = realtimeService.subscribeToTable(
      'interpretation_missions',
      '*',
      null,
      () => onUpdate()
    );
    
    // Subscribe to private reservations
    const reservationCleanup = realtimeService.subscribeToTable(
      'private_reservations',
      '*',
      'status=eq.scheduled',
      () => onUpdate()
    );
    
    return () => {
      missionCleanup();
      reservationCleanup();
    };
  }, [onUpdate]);
  
  // Method to force a data refresh
  const refreshData = useCallback(() => {
    if (onUpdate) {
      onUpdate();
    }
  }, [onUpdate]);
  
  return {
    refreshData
  };
};
