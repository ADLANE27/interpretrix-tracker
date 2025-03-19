
const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
let audioBuffer: AudioBuffer | null = null;

export const initializeNotificationSound = async () => {
  try {
    if (!audioBuffer) {
      const response = await fetch('/notification-sound.mp3');
      const arrayBuffer = await response.arrayBuffer();
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      console.log('[Sound] Notification sound initialized successfully');
    }
  } catch (error) {
    console.error('[Sound] Failed to initialize notification sound:', error);
  }
};

export const playNotificationSound = async () => {
  try {
    if (!audioBuffer) {
      console.log('[Sound] Audio buffer not initialized, initializing...');
      await initializeNotificationSound();
    }
    
    if (audioBuffer) {
      console.log('[Sound] Playing notification sound');
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start(0);
    } else {
      console.warn('[Sound] Could not play notification sound - buffer not available');
    }
  } catch (error) {
    console.error('[Sound] Failed to play notification sound:', error);
  }
};
