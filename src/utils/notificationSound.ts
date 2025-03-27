
import { toast } from '@/hooks/use-toast';

// Base64 encoded minimal notification sound (short beep)
const FALLBACK_SOUND_BASE64 = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
let audioBuffer: AudioBuffer | null = null;

export const initializeNotificationSound = async () => {
  try {
    if (!audioBuffer) {
      try {
        const response = await fetch('/notification-sound.mp3');
        
        if (!response.ok) {
          console.warn('[Notification Sound] Failed to fetch sound file, using fallback');
          return await decodeBase64Sound(FALLBACK_SOUND_BASE64);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      } catch (error) {
        console.warn('[Notification Sound] Error loading sound file, using fallback:', error);
        return await decodeBase64Sound(FALLBACK_SOUND_BASE64);
      }
    }
    return audioBuffer;
  } catch (error) {
    console.error('[Notification Sound] Failed to initialize notification sound:', error);
    toast({
      title: 'Notification Sound Error',
      description: 'Could not load notification sound. Audio alerts are disabled.',
      variant: 'destructive'
    });
    return null;
  }
};

const decodeBase64Sound = async (base64: string): Promise<AudioBuffer | null> => {
  try {
    const base64Response = await fetch(base64);
    const arrayBuffer = await base64Response.arrayBuffer();
    return await audioContext.decodeAudioData(arrayBuffer);
  } catch (error) {
    console.error('[Notification Sound] Failed to decode base64 sound:', error);
    return null;
  }
};

export const playNotificationSound = async () => {
  try {
    if (!audioBuffer) {
      audioBuffer = await initializeNotificationSound();
    }
    
    if (audioBuffer) {
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start(0);
      return true;
    }
    
    console.warn('[Notification Sound] No audio buffer available');
    return false;
  } catch (error) {
    console.error('[Notification Sound] Failed to play notification sound:', error);
    return false;
  }
};

// Initialize sound on module load, but don't block
initializeNotificationSound().catch(error => {
  console.error('[Notification Sound] Preload failed:', error);
});

