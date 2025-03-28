
let audioContext: AudioContext | null = null;
let audioBuffer: AudioBuffer | null = null;
let initializationPromise: Promise<void> | null = null;
let userInteracted = false;

const createAudioContext = () => {
  try {
    return new (window.AudioContext || (window as any).webkitAudioContext)();
  } catch (error) {
    console.error('[Audio] Failed to create AudioContext:', error);
    return null;
  }
};

// Track user interaction to enable audio
document.addEventListener('click', () => {
  userInteracted = true;
  // Resume AudioContext when user interacts with the page
  if (audioContext?.state === 'suspended') {
    audioContext.resume().catch(err => 
      console.error('[Audio] Failed to resume context after interaction:', err)
    );
  }
  
  // Lazy load the sound file after user interaction
  if (!audioBuffer) {
    initializeNotificationSound().catch(error => {
      console.error('[Audio] Failed to preload notification sound after interaction:', error);
    });
  }
}, { once: true });

export const initializeNotificationSound = async () => {
  // Return existing promise if there's one in progress
  if (initializationPromise) return initializationPromise;
  
  initializationPromise = new Promise<void>(async (resolve) => {
    try {
      if (!audioContext) {
        audioContext = createAudioContext();
      }
      
      if (!audioBuffer && audioContext) {
        const response = await fetch('/notification-sound.mp3');
        const arrayBuffer = await response.arrayBuffer();
        audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        console.log('[Audio] Notification sound loaded successfully');
      }
      resolve();
    } catch (error) {
      console.error('[Audio] Failed to initialize notification sound:', error);
      resolve(); // Resolve anyway to prevent hanging promises
    }
  });
  
  return initializationPromise;
};

export const playNotificationSound = async () => {
  try {
    // Check for user interaction first
    if (!userInteracted) {
      console.log('[Audio] Not playing notification - awaiting user interaction');
      return false;
    }
    
    // Make sure user has interacted with the page first
    if (audioContext?.state === 'suspended') {
      await audioContext.resume();
    }
    
    // Lazy initialize on demand
    if (!audioContext || !audioBuffer) {
      await initializeNotificationSound();
    }
    
    if (audioBuffer && audioContext) {
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start(0);
      return true;
    }
    return false;
  } catch (error) {
    console.error('[Audio] Failed to play notification sound:', error);
    return false;
  }
};
