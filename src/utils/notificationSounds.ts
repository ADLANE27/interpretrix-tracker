
import { supabase } from "@/integrations/supabase/client";

let audioContext: AudioContext | null = null;
let immediateSound: HTMLAudioElement | null = null;
let scheduledSound: HTMLAudioElement | null = null;
const audioElements: HTMLAudioElement[] = [];

const initializeAudioContext = () => {
  if (!audioContext) {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContext = new AudioContextClass();
      console.log('[notificationSounds] AudioContext initialized');
    } catch (error) {
      console.error('[notificationSounds] Failed to create AudioContext:', error);
    }
  }
  return audioContext;
};

const loadSound = async (type: 'immediate' | 'scheduled'): Promise<HTMLAudioElement> => {
  console.log(`[notificationSounds] Loading ${type} sound`);
  const fileName = type === 'immediate' ? 'immediate-mission.mp3' : 'scheduled-mission.mp3';
  
  const { data } = supabase.storage
    .from('notification_sounds')
    .getPublicUrl(`/${fileName}`);
  
  if (!data?.publicUrl) {
    throw new Error('No public URL returned for sound file');
  }

  const audio = new Audio();
  audio.crossOrigin = "anonymous";
  audio.preload = "auto";
  
  return new Promise((resolve, reject) => {
    audio.addEventListener('canplaythrough', () => {
      console.log(`[notificationSounds] ${type} sound loaded successfully`);
      resolve(audio);
    }, { once: true });

    audio.addEventListener('error', (error) => {
      console.error(`[notificationSounds] Error loading ${type} sound:`, error);
      reject(error);
    }, { once: true });
    
    audio.src = data.publicUrl;
    audio.load();
  });
};

const ensureSoundLoaded = async (type: 'immediate' | 'scheduled'): Promise<HTMLAudioElement> => {
  let sound = type === 'immediate' ? immediateSound : scheduledSound;
  
  if (!sound || sound.error) {
    console.log(`[notificationSounds] Loading ${type} sound`);
    try {
      sound = await loadSound(type);
      if (type === 'immediate') {
        immediateSound = sound;
      } else {
        scheduledSound = sound;
      }
      audioElements.push(sound);
      console.log(`[notificationSounds] ${type} sound initialized`);
    } catch (error) {
      console.error(`[notificationSounds] Failed to load ${type} sound:`, error);
      throw error;
    }
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

    // Reset sound to start and ensure volume is set
    sound.currentTime = 0;
    sound.volume = 1.0;

    // Attempt vibration for mobile devices
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate([200]);
      }
    } catch (error) {
      console.log('[notificationSounds] Vibration not supported:', error);
    }

    // Play sound
    const playPromise = sound.play();
    if (playPromise !== undefined) {
      await playPromise;
      console.log(`[notificationSounds] ${type} sound played successfully`);
    }
  } catch (error) {
    console.error('[notificationSounds] Error playing sound:', error);
    // Don't throw the error to prevent blocking the app flow
    // Just log it for debugging purposes
  }
};
