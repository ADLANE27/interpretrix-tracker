
import { supabase } from "@/integrations/supabase/client";

// Gestion de l'état de l'audio au niveau global
let audioContext: AudioContext | null = null;
let audioInitialized = false;
let immediateSound: HTMLAudioElement | null = null;
let scheduledSound: HTMLAudioElement | null = null;

// Initialisation de l'AudioContext avec gestion des interactions utilisateur
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

// Gestion de l'interaction utilisateur pour iOS
const handleUserInteraction = () => {
  if (!audioInitialized && audioContext) {
    // Créer et jouer un buffer silencieux pour débloquer l'audio
    const buffer = audioContext.createBuffer(1, 1, 22050);
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(0);
    audioInitialized = true;
    console.log('[notificationSounds] Audio initialized through user interaction');
    
    // Précharger les sons après l'initialisation
    playNotificationSound('immediate', true).catch(console.error);
    playNotificationSound('scheduled', true).catch(console.error);
    
    // Nettoyer les listeners une fois initialisé
    document.removeEventListener('touchstart', handleUserInteraction);
    document.removeEventListener('click', handleUserInteraction);
  }
};

// Ajouter les listeners pour l'interaction utilisateur
document.addEventListener('touchstart', handleUserInteraction);
document.addEventListener('click', handleUserInteraction);

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

    console.log(`[notificationSounds] Loading sound from URL: ${data.publicUrl}`);
    
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
        console.error(`[notificationSounds] Error loading ${type} sound:`, {
          code: error?.code,
          message: error?.message,
          networkState: audio.networkState,
          readyState: audio.readyState,
          url: data.publicUrl
        });
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
    return loadedAudio;
  } catch (error) {
    console.error(`[notificationSounds] Error initializing ${type} sound:`, error);
    throw error;
  }
};

export const playNotificationSound = async (type: 'immediate' | 'scheduled', preloadOnly: boolean = false) => {
  try {
    console.log('[notificationSounds] Attempting to play sound for:', type, 'preloadOnly:', preloadOnly);
    
    // Initialiser l'AudioContext si ce n'est pas déjà fait
    initializeAudioContext();
    
    let sound = type === 'immediate' ? immediateSound : scheduledSound;
    
    // Initialize sound if not already done or if previous initialization failed
    if (!sound || sound.error) {
      console.log(`[notificationSounds] ${type} sound needs initialization`);
      sound = await initializeSound(type);
      if (type === 'immediate') {
        immediateSound = sound;
      } else {
        scheduledSound = sound;
      }
    }
    
    // Log audio state for debugging
    console.log('[notificationSounds] Audio state:', {
      contextState: audioContext?.state,
      audioInitialized,
      readyState: sound.readyState,
      paused: sound.paused,
      networkState: sound.networkState,
      src: sound.src,
      error: sound.error
    });

    if (preloadOnly) {
      console.log('[notificationSounds] Preloading sound only');
      return;
    }

    // Réveiller l'AudioContext si nécessaire
    if (audioContext?.state === 'suspended') {
      await audioContext.resume();
      console.log('[notificationSounds] AudioContext resumed');
    }

    // Set appropriate volume for mobile
    sound.volume = 1.0;
    sound.currentTime = 0;
    
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate(200);
      }
    } catch (error) {
      console.log('[notificationSounds] Vibration not supported:', error);
    }
    
    try {
      console.log('[notificationSounds] Starting playback');
      await sound.play();
      console.log('[notificationSounds] Sound played successfully');
    } catch (error: any) {
      console.error('[notificationSounds] Error playing sound:', {
        error,
        name: error.name,
        message: error.message,
        audioState: {
          contextState: audioContext?.state,
          audioInitialized,
          readyState: sound.readyState,
          networkState: sound.networkState,
          error: sound.error
        }
      });
      
      if (error.name === 'NotAllowedError') {
        console.log('[notificationSounds] Sound blocked - attempting recovery');
        // Forcer l'initialisation audio
        audioInitialized = false;
        handleUserInteraction();
        
        // Retry after a short delay
        await new Promise(resolve => setTimeout(resolve, 100));
        try {
          await sound.play();
          console.log('[notificationSounds] Retry successful');
        } catch (retryError) {
          console.log('[notificationSounds] Retry failed, falling back to vibration');
          if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
          }
        }
      }
      
      if (error.name === 'AbortError') {
        console.log('[notificationSounds] Sound play was aborted - retrying...');
        await sound.play();
      }
      
      throw error;
    }
  } catch (error) {
    console.error('[notificationSounds] Error with audio:', error);
    throw error;
  }
};
