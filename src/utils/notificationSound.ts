
let audioContext: AudioContext | null = null;
let audioBuffer: AudioBuffer | null = null;
let initializationPromise: Promise<void> | null = null;

const createAudioContext = () => {
  try {
    return new (window.AudioContext || (window as any).webkitAudioContext)();
  } catch (error) {
    console.error('Failed to create AudioContext:', error);
    return null;
  }
};

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
      }
      resolve();
    } catch (error) {
      console.error('Failed to initialize notification sound:', error);
      resolve(); // Resolve anyway to prevent hanging promises
    }
  });
  
  return initializationPromise;
};

export const playNotificationSound = async () => {
  try {
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
    console.error('Failed to play notification sound:', error);
    return false;
  }
};

// Don't automatically preload audio - wait for user interaction
document.addEventListener('click', () => {
  // Resume AudioContext when user interacts with the page
  if (audioContext?.state === 'suspended') {
    audioContext.resume();
  }
  
  // Lazy load the sound file after user interaction
  if (!audioBuffer) {
    initializeNotificationSound().catch(error => {
      console.error('Failed to preload notification sound after interaction:', error);
    });
  }
}, { once: true });
