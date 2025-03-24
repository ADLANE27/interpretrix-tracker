
import { useEffect } from 'react';

/**
 * Hook to handle app visibility changes and trigger refresh functions
 */
export const useVisibilityUpdates = (onUpdate: () => void) => {
  useEffect(() => {
    console.log('[useVisibilityUpdates] Setting up visibility change event listeners');
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[useVisibilityUpdates] App became visible, triggering update');
        onUpdate();
      }
    };

    const handleOnline = () => {
      console.log('[useVisibilityUpdates] Network is back online, triggering update');
      onUpdate();
    };

    window.addEventListener("online", handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      console.log('[useVisibilityUpdates] Cleaning up event listeners');
      window.removeEventListener("online", handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [onUpdate]);
};
