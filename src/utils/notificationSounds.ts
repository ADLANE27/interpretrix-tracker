
const immediateSound = new Audio('/sounds/immediate-mission.mp3');
const scheduledSound = new Audio('/sounds/scheduled-mission.mp3');

// Pre-load sounds
immediateSound.load();
scheduledSound.load();

export const playNotificationSound = (type: 'immediate' | 'scheduled') => {
  try {
    console.log('[notificationSounds] Attempting to play sound for:', type);
    const sound = type === 'immediate' ? immediateSound : scheduledSound;
    
    // Set volume appropriate for mobile
    sound.volume = 0.7;
    
    // Reset the audio to start
    sound.currentTime = 0;
    
    // Play with error handling
    sound.play().catch(error => {
      console.error('[notificationSounds] Error playing sound:', error);
      if (error.name === 'NotAllowedError') {
        console.log('[notificationSounds] Sound blocked by browser - requires user interaction');
      }
    });
  } catch (error) {
    console.error('[notificationSounds] Error with audio:', error);
  }
};
