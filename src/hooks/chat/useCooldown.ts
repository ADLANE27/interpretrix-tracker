
import { useCallback, useRef } from 'react';

export const useCooldown = (
  userRole: React.MutableRefObject<string>
) => {
  const cooldownPeriod = useRef(false);

  const startCooldown = useCallback((callback: () => void, duration: number = 1000) => {
    if (!cooldownPeriod.current) {
      console.log(`[useCooldown ${userRole.current}] Starting cooldown period of ${duration}ms`);
      cooldownPeriod.current = true;
      
      setTimeout(() => {
        callback();
        cooldownPeriod.current = false;
        console.log(`[useCooldown ${userRole.current}] Cooldown period ended`);
      }, duration);
    } else {
      console.log(`[useCooldown ${userRole.current}] Already in cooldown period, skipping`);
    }
  }, [userRole]);

  return {
    cooldownPeriod,
    startCooldown
  };
};
