
let audioContext: AudioContext | null = null;
let audioInitialized = false;
let immediateSound: HTMLAudioElement | null = null;
let scheduledSound: HTMLAudioElement | null = null;
const audioElements: HTMLAudioElement[] = [];

const initializeAudioContext = () => {
  if (!audioContext) {
    try {
      // Force new AudioContext creation on each initialization attempt
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContext = new AudioContextClass();
      console.log('[notificationSounds] New AudioContext created');
    } catch (error) {
      console.error('[notificationSounds] Failed to create AudioContext:', error);
    }
  }
  return audioContext;
};

const createAndPlaySilentBuffer = async () => {
  try {
    const silentContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const buffer = silentContext.createBuffer(1, 1, 22050);
    const source = silentContext.createBufferSource();
    source.buffer = buffer;
    source.connect(silentContext.destination);
    source.start(0);
    source.stop(0.001);
    console.log('[notificationSounds] Silent buffer played successfully');
  } catch (error) {
    console.error('[notificationSounds] Error playing silent buffer:', error);
  }
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
      
      // Initialize audio context and play silent buffer
      await createAndPlaySilentBuffer();
      
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

    // Play sound with retry mechanism
    let playAttempts = 0;
    const maxAttempts = 3;

    while (playAttempts < maxAttempts) {
      try {
        playAttempts++;
        const playPromise = sound.play();
        
        if (playPromise !== undefined) {
          await playPromise;
          console.log(`[notificationSounds] ${type} sound played successfully on attempt ${playAttempts}`);
          return;
        }
      } catch (playError) {
        console.error(`[notificationSounds] Error playing sound (attempt ${playAttempts}):`, playError);
        
        if (playError instanceof Error && playError.name === 'NotAllowedError') {
          // Force audio initialization and retry
          audioInitialized = false;
          await createAndPlaySilentBuffer();
          await new Promise(resolve => setTimeout(resolve, 100 * playAttempts));
          sound.volume = 1.0;
          sound.currentTime = 0;
          continue;
        }
        
        if (playAttempts === maxAttempts) {
          throw playError;
        }
      }
    }
  } catch (error) {
    console.error('[notificationSounds] Critical error with audio:', error);
    throw error;
  }
};
