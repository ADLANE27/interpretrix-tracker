
import { realtimeService } from '@/services/realtimeService';

/**
 * Initialize application-wide services
 * This should be called once at the app root level
 */
export const initializeApp = () => {
  console.log('Initializing application services');
  
  // Initialize realtime services
  const cleanupRealtime = realtimeService.init();
  
  // Return a cleanup function for the entire app
  return () => {
    console.log('Cleaning up application services');
    cleanupRealtime();
  };
};
