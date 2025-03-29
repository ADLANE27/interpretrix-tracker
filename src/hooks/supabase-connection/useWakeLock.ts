
import { useCallback, useRef } from 'react';

export const useWakeLock = () => {
  const wakeLockRef = useRef<any>(null);

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator && !wakeLockRef.current && document.visibilityState === 'visible') {
        console.log('[useWakeLock] Requesting Wake Lock');
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        console.log('[useWakeLock] Wake Lock is active');
        
        wakeLockRef.current.addEventListener('release', () => {
          console.log('[useWakeLock] Wake Lock was released');
          wakeLockRef.current = null;
        });
      }
    } catch (err) {
      console.error('[useWakeLock] Wake Lock error:', err);
    }
  };

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release()
        .then(() => {
          console.log('[useWakeLock] Wake Lock released');
          wakeLockRef.current = null;
        })
        .catch((err: Error) => console.error('[useWakeLock] Wake Lock release error:', err));
    }
  }, []);

  return {
    requestWakeLock,
    releaseWakeLock
  };
};
