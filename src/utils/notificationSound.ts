
let audioContext: AudioContext | null = null;
let audioBuffer: AudioBuffer | null = null;
let initializationPromise: Promise<void> | null = null;
let userInteracted = false;
let interactionListenerAdded = false;

const createAudioContext = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    return new AudioCtx();
  } catch (error) {
    console.error('[Audio] Failed to create AudioContext:', error);
    return null;
  }
};

// Track user interaction to enable audio - only add once
const setupInteractionListener = () => {
  if (interactionListenerAdded) return;
  
  interactionListenerAdded = true;
  
  // Function to handle user interaction
  const handleInteraction = () => {
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
    
    // Remove listeners after first interaction
    document.removeEventListener('click', handleInteraction);
    document.removeEventListener('touchstart', handleInteraction);
    document.removeEventListener('keydown', handleInteraction);
  };

  // Listen for various user interactions
  document.addEventListener('click', handleInteraction, { once: true });
  document.addEventListener('touchstart', handleInteraction, { once: true });
  document.addEventListener('keydown', handleInteraction, { once: true });
  
  console.log('[Audio] Interaction listeners added for audio initialization');
};

// Call this early in your app initialization
setupInteractionListener();

export const initializeNotificationSound = async () => {
  // Return existing promise if there's one in progress
  if (initializationPromise) return initializationPromise;
  
  initializationPromise = new Promise<void>(async (resolve) => {
    try {
      if (!audioContext) {
        audioContext = createAudioContext();
      }
      
      if (!audioBuffer && audioContext) {
        console.log('[Audio] Loading notification sound...');
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
      try {
        await audioContext.resume();
      } catch (err) {
        console.error('[Audio] Failed to resume audio context:', err);
        return false;
      }
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

// Auto-initialize in the background after user interaction
if (userInteracted && !audioBuffer) {
  initializeNotificationSound().catch(err => {
    console.error('[Audio] Background initialization failed:', err);
  });
}
