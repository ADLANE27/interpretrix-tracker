
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import React from "react";

export const showCustomPermissionMessage = () => {
  // Check if we're in an iOS device
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  
  const handlePermissionRequest = async () => {
    try {
      if (typeof Notification === 'undefined') {
        throw new Error('Les notifications ne sont pas supportées sur ce navigateur');
      }

      if (isIOS) {
        // On iOS, redirect to settings since we can't request directly
        toast({
          title: "Configuration requise",
          description: "Sur iOS, veuillez activer les notifications dans les paramètres de votre navigateur",
          duration: 8000,
        });
        return;
      }

      const result = await Notification.requestPermission();
      if (result === 'granted') {
        // Refresh the page to ensure OneSignal picks up the new permission
        window.location.reload();
      } else {
        throw new Error('Permission refusée');
      }
    } catch (error: any) {
      console.error('[Notifications] Permission request error:', error);
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la demande d'autorisation",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  toast({
    title: "Notifications bloquées",
    description: isIOS 
      ? "Pour recevoir les nouvelles missions, veuillez activer les notifications dans les paramètres de votre appareil."
      : "Pour recevoir les nouvelles missions, veuillez autoriser les notifications dans les paramètres de votre navigateur.",
    variant: "destructive",
    duration: 10000,
    action: (
      <Button
        onClick={handlePermissionRequest}
        variant="outline"
        className="bg-white text-red-600 hover:bg-red-50"
      >
        {isIOS ? "Ouvrir les paramètres" : "Autoriser"}
      </Button>
    ),
  });
};

// Add a function to check if notifications are supported
export const areNotificationsSupported = () => {
  // Basic browser support check
  if (!('Notification' in window)) {
    console.log('[Notifications] Not supported: Notification API not available');
    return false;
  }

  // Service Workers support check
  if (!('serviceWorker' in navigator)) {
    console.log('[Notifications] Not supported: Service Workers not available');
    return false;
  }

  // Check if we're in a secure context
  if (!window.isSecureContext) {
    console.log('[Notifications] Not supported: Not in a secure context');
    return false;
  }

  return true;
};

