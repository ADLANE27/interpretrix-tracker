
const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
let audioBuffer: AudioBuffer | null = null;
let loadAttempted = false;

export const initializeNotificationSound = async () => {
  try {
    if (!audioBuffer && !loadAttempted) {
      loadAttempted = true;
      
      try {
        // First try to load from public directory
        const response = await fetch('/notification-sound.mp3');
        if (!response.ok) throw new Error(`Failed to load sound: ${response.status}`);
        
        const arrayBuffer = await response.arrayBuffer();
        audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        console.log('Notification sound initialized successfully');
      } catch (primaryError) {
        console.warn('Failed to load notification sound from primary source:', primaryError);
        
        // Fallback to a base64 encoded simple beep sound
        try {
          // This is a very simple beep sound encoded as base64
          const base64Sound = 'SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADwAC9vb29vb29vb29vb29vb29vb29vb29vb29vb29vb29vb29vb29vb29vb29vb29vb29//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAYAAAAAAAAAA8DAsuSUAAAAAAAAAAAAAAAAAAAA//swAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//vAZAAAAHkAzRkAAAIAAA/woAABFYD1Oc+YAAgAAD/CgAABJbJhEiIiHiIiUqqqkREREqqqqpEREREREiqqqqqiIiIiIiRERERERECqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqZMQU1FMy45OS41VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==';
          const arrayBuffer = base64ToArrayBuffer(base64Sound);
          audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          console.log('Using fallback notification sound');
        } catch (fallbackError) {
          console.error('Failed to load fallback notification sound:', fallbackError);
        }
      }
    }
  } catch (error) {
    console.error('Failed to initialize notification sound:', error);
  }
};

// Helper function to convert base64 to ArrayBuffer
function base64ToArrayBuffer(base64: string) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

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
      return true;
    }
    
    // If we still don't have an audio buffer, use a simple beep as last resort
    if (!audioBuffer) {
      console.log('Using system beep as last resort');
      const oscillator = audioContext.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.2);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Failed to play notification sound:', error);
    return false;
  }
};

// Initialize the sound when the module loads
initializeNotificationSound().catch(error => {
  console.error('Failed to preload notification sound:', error);
});
