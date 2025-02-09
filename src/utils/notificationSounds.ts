
import { supabase } from "@/integrations/supabase/client";

let audioContext: AudioContext | null = null;
let audioInitialized = false;
let immediateSound: HTMLAudioElement | null = null;
let scheduledSound: HTMLAudioElement | null = null;
const audioElements: HTMLAudioElement[] = [];

const initializeAudioContext = () => {
  if (!audioContext) {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContext = new AudioContextClass();
      console.log('[notificationSounds] AudioContext created');
    } catch (error) {
      console.error('[notificationSounds] Failed to create AudioContext:', error);
    }
  }
  return audioContext;
};

const loadSound = async (type: 'immediate' | 'scheduled'): Promise<HTMLAudioElement> => {
  const fileName = type === 'immediate' ? 'immediate-mission.mp3' : 'scheduled-mission.mp3';
  
  const { data } = supabase.storage
    .from('notification_sounds')
    .getPublicUrl(`/${fileName}`);
  
  if (!data?.publicUrl) {
    throw new Error('No public URL returned for sound file');
  }

  const audio = new Audio();
  audio.crossOrigin = "anonymous";
  
  return new Promise((resolve, reject) => {
    audio.addEventListener('canplaythrough', () => resolve(audio), { once: true });
    audio.addEventListener('error', reject, { once: true });
    audio.src = data.publicUrl;
    audio.load();
  });
};

const ensureSoundLoaded = async (type: 'immediate' | 'scheduled'): Promise<HTMLAudioElement> => {
  let sound = type === 'immediate' ? immediateSound : scheduledSound;
  
  if (!sound || sound.error) {
    console.log(`[notificationSounds] Loading ${type} sound`);
    sound = await loadSound(type);
    if (type === 'immediate') {
      immediateSound = sound;
    } else {
      scheduledSound = sound;
    }
    audioElements.push(sound);
  }
  
  return sound;
};

export const playNotificationSound = async (type: 'immediate' | 'scheduled', preloadOnly: boolean = false) => {
  try {
    console.log('[notificationSounds] Attempting to play sound for:', type, 'preloadOnly:', preloadOnly);
    
    // Initialize audio context first
    initializeAudioContext();
    
    // Ensure sound is loaded
    const sound = await ensureSoundLoaded(type);
    
    if (preloadOnly) {
      console.log('[notificationSounds] Preloading only, skipping playback');
      return;
    }

    // Resume AudioContext if suspended
    if (audioContext?.state === 'suspended') {
      await audioContext.resume();
    }

    // Reset sound to start
    sound.currentTime = 0;
    sound.volume = 1.0;

    try {
      // Attempt vibration
      if ('vibrate' in navigator) {
        navigator.vibrate(200);
      }
    } catch (error) {
      console.log('[notificationSounds] Vibration not supported:', error);
    }

    // Play sound
    try {
      await sound.play();
      console.log(`[notificationSounds] ${type} sound played successfully`);
    } catch (playError) {
      console.error('[notificationSounds] Error playing sound:', playError);
      
      if (playError instanceof Error && playError.name === 'NotAllowedError') {
        // Force audio initialization and retry
        audioInitialized = false;
        await new Promise(resolve => setTimeout(resolve, 100));
        sound.volume = 1.0;
        sound.currentTime = 0;
        await sound.play();
        console.log('[notificationSounds] Sound played after retry');
      } else {
        throw playError;
      }
    }
  } catch (error) {
    console.error('[notificationSounds] Critical error with audio:', error);
    throw error;
  }
};
