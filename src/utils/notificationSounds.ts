
const immediateSound = new Audio('/sounds/immediate-mission.mp3');
const scheduledSound = new Audio('/sounds/scheduled-mission.mp3');

export const playNotificationSound = (type: 'immediate' | 'scheduled') => {
  try {
    const sound = type === 'immediate' ? immediateSound : scheduledSound;
    sound.volume = 0.5; // Default volume
    sound.play().catch(error => {
      console.error('[notificationSounds] Error playing sound:', error);
    });
  } catch (error) {
    console.error('[notificationSounds] Error with audio:', error);
  }
};
