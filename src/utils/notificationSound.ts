
const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
let audioBuffer: AudioBuffer | null = null;

export const initializeNotificationSound = async () => {
  try {
    if (!audioBuffer) {
      const response = await fetch('/notification-sound.mp3');
      const arrayBuffer = await response.arrayBuffer();
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    }
  } catch (error) {
    console.error('Failed to initialize notification sound:', error);
  }
};

export const playNotificationSound = async () => {
  try {
    if (!audioBuffer) {
      await initializeNotificationSound();
    }
    
    if (audioBuffer) {
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start(0);
    }
  } catch (error) {
    console.error('Failed to play notification sound:', error);
  }
};
