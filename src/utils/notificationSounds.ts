
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
  audio.preload = "auto"; // Force preloading
  
  return new Promise((resolve, reject) => {
    const onLoad = () => {
      console.log(`[notificationSounds] ${type} sound loaded successfully`);
      resolve(audio);
    };

    const onError = (error: ErrorEvent) => {
      console.error(`[notificationSounds] Error loading ${type} sound:`, error);
      reject(error);
    };

    audio.addEventListener('canplaythrough', onLoad, { once: true });
    audio.addEventListener('error', onError, { once: true });
    
    // Set source and load after adding event listeners
    audio.src = data.publicUrl;
    audio.load();

    // Set a timeout to reject if loading takes too long
    setTimeout(() => {
      if (!audio.readyState) {
        const timeoutError = new Error(`Timeout loading ${type} sound`);
        console.error('[notificationSounds]', timeoutError);
        reject(timeoutError);
      }
    }, 10000);
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
      
      // Create a silent buffer and play it to initialize audio on mobile
      const silentContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const buffer = silentContext.createBuffer(1, 1, 22050);
      const source = silentContext.createBufferSource();
      source.buffer = buffer;
      source.connect(silentContext.destination);
      source.start(0);
      source.stop(0.001);
      
      console.log(`[notificationSounds] ${type} sound initialized for mobile`);
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
        navigator.vibrate(200);
      }
    } catch (error) {
      console.log('[notificationSounds] Vibration not supported:', error);
    }

    // Play sound with retry mechanism
    try {
      const playPromise = sound.play();
      if (playPromise !== undefined) {
        await playPromise;
        console.log(`[notificationSounds] ${type} sound played successfully`);
      }
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
