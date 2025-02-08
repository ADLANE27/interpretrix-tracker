
const immediateSound = new Audio('/sounds/immediate-mission.mp3');
const scheduledSound = new Audio('/sounds/scheduled-mission.mp3');

// Pre-load sounds
immediateSound.load();
scheduledSound.load();

export const playNotificationSound = async (type: 'immediate' | 'scheduled', preloadOnly: boolean = false) => {
  try {
    console.log('[notificationSounds] Attempting to play sound for:', type);
    const sound = type === 'immediate' ? immediateSound : scheduledSound;
    
    // Just preload the sound if preloadOnly is true
    if (preloadOnly) {
      sound.load();
      return;
    }

    // Set volume appropriate for mobile (slightly louder)
    sound.volume = 1.0;
    
    // Reset the audio to start
    sound.currentTime = 0;
    
    // Play with proper error handling and awaiting
    try {
      await sound.play();
      console.log('[notificationSounds] Sound played successfully');
    } catch (error: any) {
      console.error('[notificationSounds] Error playing sound:', error);
      
      if (error.name === 'NotAllowedError') {
        console.log('[notificationSounds] Sound blocked by browser - requires user interaction');
        throw new Error('User interaction required to play sound');
      }
      
      if (error.name === 'AbortError') {
        console.log('[notificationSounds] Sound play was aborted - retrying...');
        // Retry once
        await sound.play();
      }
      
      throw error;
    }
  } catch (error) {
    console.error('[notificationSounds] Error with audio:', error);
    throw error;
  }
};
