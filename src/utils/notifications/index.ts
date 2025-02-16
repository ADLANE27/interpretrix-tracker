
import { toast } from "@/components/ui/use-toast";
import { playNotificationSound } from "@/utils/notificationSounds";

// Basic notification functionality without OneSignal
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    if (!('Notification' in window)) {
      toast({
        title: "Non supporté",
        description: "Les notifications ne sont pas supportées sur votre navigateur",
        variant: "destructive",
        duration: 5000,
      });
      return false;
    }

    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      // Play notification sound on success
      await playNotificationSound('scheduled');
      
      toast({
        title: "Notifications activées",
        description: "Vous recevrez désormais les notifications pour les nouvelles missions",
        duration: 3000,
      });
      
      return true;
    } else {
      throw new Error('Permission not granted');
    }
  } catch (error: any) {
    console.error('Notification Error:', error);
    toast({
      title: "Erreur",
      description: error.message || "Une erreur est survenue lors de l'activation des notifications",
      variant: "destructive",
      duration: 5000,
    });
    return false;
  }
};

// Check if notifications are enabled
export const isNotificationsEnabled = async (): Promise<boolean> => {
  return Notification.permission === 'granted';
};

// Unregister device from notifications
export const unregisterDevice = async (): Promise<boolean> => {
  return true;
};
