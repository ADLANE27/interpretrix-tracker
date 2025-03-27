
import { useRealtimeSync } from '@/context/RealtimeContext';

export const useMissionUpdates = (onUpdate: () => void) => {
  return useRealtimeSync(onUpdate);
};
