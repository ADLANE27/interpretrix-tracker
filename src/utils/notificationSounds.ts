
import { supabase } from "@/integrations/supabase/client";

let immediateSound: HTMLAudioElement | null = null;
let scheduledSound: HTMLAudioElement | null = null;

const initializeSound = async (type: 'immediate' | 'scheduled') => {
  try {
    console.log(`[notificationSounds] Initializing ${type} sound`);
    const fileName = `${type}-mission.mp3`;
    
    // Get public URL for the sound file
    const { data } = supabase
      .storage
      .from('notification_sounds')
      .getPublicUrl(fileName);
    
    if (!data.publicUrl) {
      console.error('[notificationSounds] No public URL returned');
      throw new Error('No public URL returned for sound file');
    }

    console.log(`[notificationSounds] Loading sound from URL: ${data.publicUrl}`);
    
    const audio = new Audio();
    
    // Set CORS and cache settings
    audio.crossOrigin = "anonymous";
    
    // Add event listeners before setting src
    const loadPromise = new Promise((resolve, reject) => {
      const onCanPlay = () => {
        console.log(`[notificationSounds] ${type} sound loaded successfully`);
        audio.removeEventListener('canplaythrough', onCanPlay);
        audio.removeEventListener('error', onError);
        resolve(true);
      };
      
      const onError = (e: ErrorEvent) => {
        console.error(`[notificationSounds] Error loading ${type} sound:`, e);
        audio.removeEventListener('canplaythrough', onCanPlay);
        audio.removeEventListener('error', onError);
        reject(new Error(`Failed to load ${type} sound: ${e.message}`));
      };
      
      audio.addEventListener('canplaythrough', onCanPlay);
      audio.addEventListener('error', onError);
    });
    
    // Set the source after adding event listeners
    audio.src = data.publicUrl;
    audio.load();
    
    // Wait for the audio to be loaded
    await loadPromise;
    
    return audio;
  } catch (error) {
    console.error(`[notificationSounds] Error initializing ${type} sound:`, error);
    throw error;
  }
};

export const playNotificationSound = async (type: 'immediate' | 'scheduled', preloadOnly: boolean = false) => {
  try {
    console.log('[notificationSounds] Attempting to play sound for:', type);
    
    // Initialize sound if not already done
    if (!immediateSound && type === 'immediate') {
      immediateSound = await initializeSound('immediate');
    }
    if (!scheduledSound && type === 'scheduled') {
      scheduledSound = await initializeSound('scheduled');
    }
    
    const sound = type === 'immediate' ? immediateSound : scheduledSound;
    
    if (!sound) {
      throw new Error('Sound not initialized');
    }
    
    // Log the audio element state
    console.log('[notificationSounds] Audio state:', {
      readyState: sound.readyState,
      paused: sound.paused,
      networkState: sound.networkState,
      src: sound.src,
      error: sound.error
    });

    // Just preload the sound if preloadOnly is true
    if (preloadOnly) {
      console.log('[notificationSounds] Preloading sound');
      try {
        await new Promise((resolve, reject) => {
          const onCanPlay = () => {
            sound.removeEventListener('canplaythrough', onCanPlay);
            sound.removeEventListener('error', onError);
            resolve(true);
          };
          
          const onError = (e: ErrorEvent) => {
            sound.removeEventListener('canplaythrough', onCanPlay);
            sound.removeEventListener('error', onError);
            reject(new Error(`Failed to load sound: ${e.message}`));
          };
          
          sound.addEventListener('canplaythrough', onCanPlay);
          sound.addEventListener('error', onError);
          sound.load();
        });
        console.log('[notificationSounds] Sound preloaded successfully');
        return;
      } catch (error) {
        console.error('[notificationSounds] Preload failed:', error);
        throw error;
      }
    }

    // Set volume appropriate for mobile (slightly louder)
    sound.volume = 1.0;
    
    // Reset the audio to start
    sound.currentTime = 0;
    
    // Play with proper error handling and awaiting
    try {
      console.log('[notificationSounds] Starting playback');
      await sound.play();
      console.log('[notificationSounds] Sound played successfully');
    } catch (error: any) {
      console.error('[notificationSounds] Error playing sound:', error);
      
      if (error.name === 'NotAllowedError') {
        console.log('[notificationSounds] Sound blocked by browser - requires user interaction');
        throw new Error('User interaction required to play sound');
      }
      
      if (error.name === 'AbortError') {
        console.log('[notificationSounds] Sound play was aborted - retrying...');
        // Retry once
        await sound.play();
      }
      
      throw error;
    }
  } catch (error) {
    console.error('[notificationSounds] Error with audio:', error);
    throw error;
  }
};
