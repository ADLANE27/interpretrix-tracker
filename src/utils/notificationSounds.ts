import { supabase } from "@/integrations/supabase/client";

// Global audio state
let audioContext: AudioContext | null = null;
let audioInitialized = false;
let immediateSound: HTMLAudioElement | null = null;
let scheduledSound: HTMLAudioElement | null = null;

// For iOS, we need to keep references to audio elements
const audioElements: HTMLAudioElement[] = [];

// Initialize AudioContext
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

// Handle iOS specific audio initialization
const handleIOSAudio = async () => {
  console.log('[notificationSounds] Initializing iOS audio');
  
  // Create new audio elements for iOS
  const immediate = new Audio();
  const scheduled = new Audio();
  
  // Add to global array to maintain references
  audioElements.push(immediate, scheduled);
  
  try {
    // Load sounds
    const { data: immediateData } = supabase.storage
      .from('notification_sounds')
      .getPublicUrl('/immediate-mission.mp3');
      
    const { data: scheduledData } = supabase.storage
      .from('notification_sounds')
      .getPublicUrl('/scheduled-mission.mp3');

    if (immediateData?.publicUrl && scheduledData?.publicUrl) {
      immediate.src = immediateData.publicUrl;
      scheduled.src = scheduledData.publicUrl;
      
      // Load sounds
      await immediate.load();
      await scheduled.load();
      
      console.log('[notificationSounds] iOS audio initialized successfully');
      return true;
    }
  } catch (error) {
    console.error('[notificationSounds] iOS audio initialization failed:', error);
    return false;
  }
  return false;
};

// Initialize a specific sound
const initializeSound = async (type: 'immediate' | 'scheduled') => {
  try {
    console.log(`[notificationSounds] Initializing ${type} sound`);
    
    const fileName = type === 'immediate' 
      ? 'immediate-mission.mp3'
      : 'scheduled-mission.mp3';
    
    const { data } = supabase
      .storage
      .from('notification_sounds')
      .getPublicUrl(`/${fileName}`);
    
    if (!data?.publicUrl) {
      console.error('[notificationSounds] No public URL returned');
      throw new Error('No public URL returned for sound file');
    }

    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    
    const loadPromise = new Promise<HTMLAudioElement>((resolve, reject) => {
      const onCanPlay = () => {
        console.log(`[notificationSounds] ${type} sound loaded successfully`);
        audio.removeEventListener('canplaythrough', onCanPlay);
        audio.removeEventListener('error', onError);
        resolve(audio);
      };
      
      const onError = (e: Event) => {
        const error = (e.target as HTMLAudioElement).error;
        console.error(`[notificationSounds] Error loading ${type} sound:`, error);
        audio.removeEventListener('canplaythrough', onCanPlay);
        audio.removeEventListener('error', onError);
        reject(new Error(`Failed to load ${type} sound: ${error?.message || 'Unknown error'}`));
      };
      
      audio.addEventListener('canplaythrough', onCanPlay);
      audio.addEventListener('error', onError);
    });
    
    audio.src = data.publicUrl;
    audio.load();
    
    const loadedAudio = await loadPromise;
    console.log(`[notificationSounds] ${type} sound ready to play`);
    
    // Add to audio elements array for iOS
    audioElements.push(loadedAudio);
    
    return loadedAudio;
  } catch (error) {
    console.error(`[notificationSounds] Error initializing ${type} sound:`, error);
    throw error;
  }
};

// Only initialize once
let initializationInProgress = false;
let initializationPromise: Promise<void> | null = null;

// Initialize audio system
const initializeAudioSystem = async () => {
  if (initializationInProgress) {
    return initializationPromise;
  }

  if (audioInitialized) {
    return;
  }

  initializationInProgress = true;
  initializationPromise = (async () => {
    try {
      console.log('[notificationSounds] Initializing audio system');
      
      // Initialize AudioContext
      initializeAudioContext();
      
      // Create and play a buffer silently to unlock audio
      if (audioContext) {
        const buffer = audioContext.createBuffer(1, 1, 22050);
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start(0);
      }
      
      // Initialize for iOS
      const iosInitialized = await handleIOSAudio();
      
      if (iosInitialized) {
        audioInitialized = true;
        console.log('[notificationSounds] Audio system initialized');
        
        // Preload sounds
        await Promise.all([
          initializeSound('immediate'),
          initializeSound('scheduled')
        ]).catch(console.error);
      }
    } catch (error) {
      console.error('[notificationSounds] Error initializing audio system:', error);
      throw error;
    } finally {
      initializationInProgress = false;
      initializationPromise = null;
    }
  })();

  return initializationPromise;
};

// Main function to play notification sounds
export const playNotificationSound = async (type: 'immediate' | 'scheduled', preloadOnly: boolean = false) => {
  try {
    // Only initialize if not preloading
    if (!preloadOnly && !audioInitialized) {
      await initializeAudioSystem();
    }

    console.log('[notificationSounds] Attempting to play sound for:', type, 'preloadOnly:', preloadOnly);
    
    let sound = type === 'immediate' ? immediateSound : scheduledSound;
    
    // Initialize sound if needed
    if (!sound || sound.error) {
      console.log(`[notificationSounds] ${type} sound needs initialization`);
      sound = await initializeSound(type);
      if (type === 'immediate') {
        immediateSound = sound;
      } else {
        scheduledSound = sound;
      }
    }
    
    if (preloadOnly) {
      console.log('[notificationSounds] Preloading sound only');
      return;
    }

    // Wake up AudioContext if needed
    if (audioContext?.state === 'suspended') {
      await audioContext.resume();
      console.log('[notificationSounds] AudioContext resumed');
    }

    // Set volume and reset position
    sound.volume = 1.0;
    sound.currentTime = 0;
    
    // Try to vibrate
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate(200);
      }
    } catch (error) {
      console.log('[notificationSounds] Vibration not supported:', error);
    }
    
    // Play the sound
    try {
      console.log('[notificationSounds] Starting playback');
      await sound.play();
      console.log('[notificationSounds] Sound played successfully');
    } catch (error: any) {
      console.error('[notificationSounds] Error playing sound:', error);
      
      if (error.name === 'NotAllowedError') {
        console.log('[notificationSounds] NotAllowedError - attempting recovery');
        
        // Force reinitialization for iOS
        audioInitialized = false;
        await initializeAudioSystem();
        
        // Retry after a short delay
        await new Promise(resolve => setTimeout(resolve, 100));
        try {
          sound.volume = 1.0;
          sound.currentTime = 0;
          await sound.play();
          console.log('[notificationSounds] Recovery successful');
        } catch (retryError) {
          console.error('[notificationSounds] Recovery failed:', retryError);
          // Last resort: vibration only
          if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
          }
        }
      }
    }
  } catch (error) {
    console.error('[notificationSounds] Critical error with audio:', error);
    throw error;
  }
};
