
import { useInterpreterStatus } from './mission/useInterpreterStatus';
import { useVisibilityUpdates } from './mission/useVisibilityUpdates';
import { useStatusEventListener } from './mission/useStatusEventListener';
import { useRealtimeMissionUpdates } from './mission/useRealtimeMissionUpdates';

/**
 * Main hook to manage mission updates and interpreter status changes
 */
export const useMissionUpdates = (onUpdate: () => void) => {
  // Setup visibility change and online status listeners
  useVisibilityUpdates(onUpdate);
  
  // Setup status update event listener
  useStatusEventListener(onUpdate);
  
  // Setup realtime database subscriptions
  useRealtimeMissionUpdates(onUpdate);
  
  // Get status update functionality
  const { updateInterpreterStatus } = useInterpreterStatus();
  
  return {
    updateInterpreterStatus
  };
};
