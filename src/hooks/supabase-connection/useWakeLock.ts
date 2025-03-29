
import { useCallback, useRef, useState, useEffect } from 'react';

export const useWakeLock = () => {
  const wakeLockRef = useRef<any>(null);
  const [isWakeLockSupported, setIsWakeLockSupported] = useState<boolean | null>(null);
  const [isWakeLockActive, setIsWakeLockActive] = useState(false);

  useEffect(() => {
    setIsWakeLockSupported('wakeLock' in navigator);
  }, []);

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator && !wakeLockRef.current && document.visibilityState === 'visible') {
        console.log('[useWakeLock] Requesting Wake Lock');
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        console.log('[useWakeLock] Wake Lock is active');
        setIsWakeLockActive(true);
        
        wakeLockRef.current.addEventListener('release', () => {
          console.log('[useWakeLock] Wake Lock was released');
          wakeLockRef.current = null;
          setIsWakeLockActive(false);
        });

        // Setup auto-renewal
        document.addEventListener('visibilitychange', handleVisibilityChange);
      }
    } catch (err) {
      console.error('[useWakeLock] Wake Lock error:', err);
      setIsWakeLockActive(false);
    }
  };

  const handleVisibilityChange = async () => {
    if (document.visibilityState === 'visible' && !wakeLockRef.current) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        setIsWakeLockActive(true);
      } catch (err) {
        console.error('[useWakeLock] Error reacquiring wake lock:', err);
      }
    }
  };

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release()
        .then(() => {
          console.log('[useWakeLock] Wake Lock released');
          wakeLockRef.current = null;
          setIsWakeLockActive(false);
        })
        .catch((err: Error) => console.error('[useWakeLock] Wake Lock release error:', err));
      
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  }, []);

  useEffect(() => {
    return () => {
      releaseWakeLock();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [releaseWakeLock]);

  return {
    requestWakeLock,
    releaseWakeLock,
    isWakeLockSupported,
    isWakeLockActive
  };
};
